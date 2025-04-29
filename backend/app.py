"""
主应用入口 - 配置和启动Flask服务器
"""
import os
import logging
import sys

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, jsonify
from flask_cors import CORS

# 导入配置
from backend.config import SECRET_KEY, DEBUG, HOST, PORT

# 导入路由蓝图
from backend.routes import auth_bp, ssh_bp, serial_bp, test_cases_bp, files_bp, logs_bp

# 设置日志文件路径 - 直接使用data目录，不创建logs子目录
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
# 不再创建logs子目录

# 配置日志 - 只输出到控制台，不生成app.log文件
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)

def create_app(config=None):
    """
    创建Flask应用实例
    
    Args:
        config: 配置对象
    
    Returns:
        Flask应用实例
    """
    app = Flask(__name__)
    
    # 设置默认配置
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key'),
        DATABASE=os.path.join(app.instance_path, 'database.sqlite'),
        DATA_DIR=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data'),  # 添加DATA_DIR配置
    )
    
    if config:
        # 加载传入的配置
        app.config.from_mapping(config)
    
    # 配置CORS，允许前端访问
    CORS(app, resources={r"/api/*": {"origins": "*", "supports_credentials": True}})
    
    # 注册蓝图
    app.register_blueprint(auth_bp)
    app.register_blueprint(ssh_bp)
    app.register_blueprint(serial_bp)
    app.register_blueprint(test_cases_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(logs_bp)
    
    @app.route('/')
    def index():
        return {"message": "Visual Protocol 180 API"}
    
    # 添加服务器信息API端点
    @app.route('/api/server/info', methods=['GET'])
    def server_info():
        """返回服务器运行信息，便于前端验证连接"""
        return jsonify({
            "success": True,
            "message": "服务器信息",
            "data": {
                "host": HOST,
                "port": PORT,
                "debug": DEBUG,
                "version": "1.0.0",
                "server_time": os.popen("date").read().strip()
            }
        })
    
    return app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    # 启动应用
    app.run(host=HOST, debug=DEBUG, port=PORT) 