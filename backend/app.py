"""
主应用入口 - 配置和启动Flask服务器
"""
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# 导入配置
from backend.config import SECRET_KEY, DEBUG, HOST, PORT

# 导入路由蓝图
from backend.routes import auth_bp, ssh_bp, serial_bp, test_cases_bp, files_bp

# 设置日志目录
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, 'app.log'), encoding='utf-8')
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
    
    @app.route('/')
    def index():
        return {"message": "Visual Protocol 180 API"}
    
    return app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    # 启动应用
    app.run(host=HOST, debug=DEBUG, port=PORT) 