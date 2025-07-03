"""
主应用入口 - 配置和启动Flask服务器
"""
import os
import logging
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入配置
from backend.config import SECRET_KEY, DEBUG, HOST, PORT

# 导入路由蓝图
from backend.routes import auth_bp, ssh_bp, serial_bp, test_cases_bp, files_bp, logs_bp, screen_bp, settings_bp, reports_bp

# 导入触摸屏监控
from backend.utils.touch_monitor_ssh import TouchMonitor

# 设置日志文件路径
LOG_DIR = os.path.join(os.path.dirname(__file__), 'data')

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)

logger = logging.getLogger(__name__)

def create_app(config=None):
    """
    创建Flask应用实例
    """
    app = Flask(__name__)
    sock = Sock(app)
    
    # 设置默认配置
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key'),
        DATABASE=os.path.join(app.instance_path, 'database.sqlite'),
        DATA_DIR=os.path.join(os.path.dirname(__file__), 'data'),
    )
    
    if config:
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
    app.register_blueprint(screen_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(reports_bp)
    
    # 创建TouchMonitor实例
    touch_monitor = TouchMonitor()
    
    @sock.route('/ws/touch-monitor')
    def touch_monitor_socket(ws):
        """WebSocket路由处理触摸屏监控"""
        logger.info("新的WebSocket连接已建立")
        try:
            while True:
                data = ws.receive()
                logger.debug(f"收到WebSocket消息: {data}")
                command = json.loads(data)
                if command['action'] == 'start':
                    logger.info("开始监控触摸事件")
                    touch_monitor.start_monitoring(ws)
                elif command['action'] == 'stop':
                    logger.info("停止监控触摸事件")
                    touch_monitor.stop_monitoring()
        except Exception as e:
            logger.error(f"WebSocket处理错误: {str(e)}")
            try:
                ws.send(json.dumps({
                    "type": "error",
                    "message": f"WebSocket处理错误: {str(e)}"
                }))
            except:
                pass
        finally:
            logger.info("WebSocket连接已关闭")
            touch_monitor.stop_monitoring()
    
    @app.route('/')
    def index():
        return {"message": "Visual Protocol 180 API"}
    
    return app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    try:
        # 启动应用
        app.run(host=HOST, debug=DEBUG, port=PORT)
    except Exception as e:
        logger.error(f"应用启动失败: {str(e)}")
    finally:
        logger.info("应用已停止") 