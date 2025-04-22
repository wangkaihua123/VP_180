"""
主应用入口 - 组装所有模块并启动服务
"""
import os
import logging
from flask import Flask
from flask_cors import CORS

# 导入配置
from backend.config import SECRET_KEY, DEBUG, HOST, PORT

# 导入路由蓝图
from backend.routes.auth import auth_bp
from backend.routes.ssh import ssh_bp
from backend.routes.serial import serial_bp
from backend.routes.test_cases import test_cases_bp
from backend.routes.files import files_bp

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

def create_app():
    """创建并配置Flask应用"""
    # 创建Flask实例
    app = Flask(__name__)
    
    # 配置应用
    app.secret_key = SECRET_KEY
    
    # 配置CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # 注册蓝图
    app.register_blueprint(auth_bp)
    app.register_blueprint(ssh_bp)
    app.register_blueprint(serial_bp)
    app.register_blueprint(test_cases_bp)
    app.register_blueprint(files_bp)
    
    return app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    # 启动应用
    app.run(host=HOST, debug=DEBUG, port=PORT) 