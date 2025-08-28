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
from config import SECRET_KEY, DEBUG, HOST, PORT

# 导入路由蓝图
from routes import auth_bp, ssh_bp, serial_bp, test_cases_bp, files_bp, logs_bp, screen_bp, settings_bp, reports_bp

# 导入触摸屏监控
from utils.touch_monitor_ssh import TouchMonitor

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
    
    # 创建TouchMonitor实例（初始时不指定项目ID）
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
                    # 如果命令中包含项目ID，设置项目ID
                    if 'project_id' in command:
                        touch_monitor.set_project_id(command['project_id'])
                    touch_monitor.start_monitoring(ws)
                elif command['action'] == 'stop':
                    logger.info("停止监控触摸事件")
                    touch_monitor.stop_monitoring()
                elif command['action'] == 'set_project':
                    # 单独设置项目ID的命令
                    project_id = command.get('project_id')
                    if project_id:
                        touch_monitor.set_project_id(project_id)
                        logger.info(f"已设置触摸监控的项目ID为: {project_id}")
                        ws.send(json.dumps({
                            "type": "success",
                            "message": f"已设置项目ID为 {project_id}"
                        }))
                    else:
                        ws.send(json.dumps({
                            "type": "error",
                            "message": "缺少项目ID参数"
                        }))
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
    
    @sock.route('/ws/logs')
    def logs_socket(ws):
        """WebSocket路由处理日志文件监听"""
        logger.info("新的日志WebSocket连接已建立")
        import os
        import time
        import hashlib
        
        # 设置日志文件路径
        log_file_path = os.path.join(os.path.dirname(__file__), 'data', 'logs', 'VP_180.log')
        logger.info(f"监听日志文件: {log_file_path}")
        
        last_size = 0  # 记录上次读取的文件大小
        last_mtime = 0  # 记录上次读取的文件修改时间
        file_position = 0  # 当前文件读取位置
        test_completed = False  # 标记测试是否已完成
        last_content_hash = None  # 记录上次读取内容的哈希值，用于检测重复内容
        duplicate_detection_threshold = 2  # 重复检测阈值（秒）
        last_send_time = 0  # 记录上次发送日志的时间
        
        try:
            # 初始检查文件是否存在
            if os.path.exists(log_file_path):
                last_size = os.path.getsize(log_file_path)
                last_mtime = os.path.getmtime(log_file_path)
                file_position = last_size
                logger.info(f"初始文件大小: {last_size} 字节")
            else:
                logger.warning(f"日志文件不存在: {log_file_path}")
            
            while True:
                # 检查是否有客户端消息
                try:
                    data = ws.receive(timeout=0.1)  # 设置短超时以便定期检查文件
                    if data:
                        command = json.loads(data)
                        if command.get('action') == 'stop':
                            logger.info("收到停止日志监听命令")
                            break
                        elif command.get('action') == 'reset':
                            logger.info("重置日志读取位置并清空日志文件")
                            file_position = 0  # 重置读取位置到文件开头
                            test_completed = False  # 重置测试完成标记
                            last_content_hash = None  # 重置内容哈希
                            last_send_time = 0  # 重置发送时间
                            
                            if os.path.exists(log_file_path):
                                # 清空日志文件
                                try:
                                    with open(log_file_path, 'w', encoding='utf-8') as file:
                                        file.write('')  # 清空文件内容
                                    
                                    # 更新读取位置和修改时间
                                    file_position = 0
                                    last_size = 0
                                    last_mtime = os.path.getmtime(log_file_path)
                                    
                                    logger.info(f"已清空日志文件: {log_file_path}")
                                    
                                    # 发送空日志列表到客户端，确保前端清空显示
                                    ws.send(json.dumps({
                                        'type': 'logs',
                                        'data': []
                                    }))
                                    
                                    # 发送重置完成状态
                                    ws.send(json.dumps({
                                        'type': 'status',
                                        'message': '日志文件已重置'
                                    }))
                                except Exception as e:
                                    logger.error(f"清空日志文件时出错: {str(e)}")
                                    ws.send(json.dumps({
                                        'type': 'error',
                                        'message': f"清空日志文件失败: {str(e)}"
                                    }))
                            else:
                                logger.warning("重置时日志文件不存在，创建新文件")
                                # 创建新的空日志文件
                                try:
                                    os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
                                    with open(log_file_path, 'w', encoding='utf-8') as file:
                                        file.write('')  # 创建空文件
                                    
                                    file_position = 0
                                    last_size = 0
                                    last_mtime = os.path.getmtime(log_file_path)
                                    last_content_hash = None  # 重置内容哈希
                                    last_send_time = 0  # 重置发送时间
                                    
                                    ws.send(json.dumps({
                                        'type': 'logs',
                                        'data': []
                                    }))
                                    
                                    ws.send(json.dumps({
                                        'type': 'status',
                                        'message': '已创建新的日志文件'
                                    }))
                                except Exception as e:
                                    logger.error(f"创建日志文件时出错: {str(e)}")
                                    ws.send(json.dumps({
                                        'type': 'error',
                                        'message': f"创建日志文件失败: {str(e)}"
                                    }))
                except:
                    # 超时是正常的，继续处理
                    pass
                
                # 如果测试已完成，不再监听文件变化
                if test_completed:
                    logger.info("测试已完成，停止监听文件变化")
                    break
                
                # 检查日志文件是否存在且是否有变化
                if os.path.exists(log_file_path):
                    current_size = os.path.getsize(log_file_path)
                    current_mtime = os.path.getmtime(log_file_path)
                    
                    # 只有当文件大小或修改时间变化时才读取
                    if current_size != last_size or current_mtime != last_mtime:
                        logger.info(f"检测到文件变化: 大小 {last_size} -> {current_size}, 修改时间 {last_mtime} -> {current_mtime}")
                        
                        # 检查是否在短时间内重复发送
                        current_time = time.time()
                        if current_time - last_send_time < duplicate_detection_threshold:
                            logger.info(f"距离上次发送时间过短 ({current_time - last_send_time:.2f}s)，跳过此次处理")
                            # 更新文件大小和修改时间，避免重复检测
                            last_size = current_size
                            last_mtime = current_mtime
                            continue
                        
                        try:
                            with open(log_file_path, 'r', encoding='utf-8') as file:
                                # 如果文件大小变小了，可能是文件被清空或重写，从头开始读取
                                if current_size < file_position:
                                    logger.info(f"文件大小变小，可能是文件被清空或重写，重置读取位置")
                                    file_position = 0
                                
                                # 移动到上次读取的位置
                                file.seek(file_position)
                                
                                # 读取新增内容
                                new_content = file.read()
                                
                                # 计算新内容的哈希值
                                content_hash = hashlib.md5(new_content.encode('utf-8')).hexdigest()
                                
                                # 检查是否与上次内容相同
                                if content_hash == last_content_hash and new_content:
                                    logger.info("检测到重复内容，跳过发送")
                                    # 更新文件位置和大小，但跳过发送
                                    file_position = file.tell()
                                    last_size = current_size
                                    last_mtime = current_mtime
                                    continue
                                
                                # 更新读取位置和修改时间
                                file_position = file.tell()
                                last_size = current_size
                                last_mtime = current_mtime
                                last_content_hash = content_hash
                                
                                logger.info(f"读取新增内容，长度: {len(new_content)} 字符")
                                
                                # 如果有新内容，发送到客户端
                                if new_content:
                                    # 处理日志行，解析日期、级别等信息
                                    parsed_logs = []
                                    for line in new_content.split('\n'):
                                        line = line.strip()
                                        if not line:
                                            continue
                                        
                                        # 尝试解析日志格式
                                        parts = line.split(' - ', 3)
                                        if len(parts) >= 4:
                                            timestamp, level, source, message = parts
                                            parsed_logs.append({
                                                'timestamp': timestamp,
                                                'level': level,
                                                'source': source,
                                                'message': message
                                            })
                                        else:
                                            # 如果格式不匹配，直接将整行作为消息
                                            parsed_logs.append({
                                                'timestamp': '',
                                                'level': 'UNKNOWN',
                                                'source': '',
                                                'message': line
                                            })
                                    
                                    # 如果有新日志，发送到客户端
                                    if parsed_logs:
                                        # 更新发送时间
                                        last_send_time = current_time
                                        logger.info(f"发送 {len(parsed_logs)} 条新日志到客户端")
                                        ws.send(json.dumps({
                                            'type': 'logs',
                                            'data': parsed_logs
                                        }))
                                        
                                        # 检查是否包含测试完成标记
                                        for log in parsed_logs:
                                            if '测试执行已完成' in log['message'] or '所有测试用例执行完成' in log['message']:
                                                logger.info("检测到测试完成标记，停止日志监控")
                                                test_completed = True
                                                ws.send(json.dumps({
                                                    'type': 'status',
                                                    'message': '测试执行已完成'
                                                }))
                                                # 不立即返回，而是等待下一次循环检查test_completed标记
                        except Exception as e:
                            logger.error(f"读取日志文件时出错: {str(e)}")
                
                # 短暂休眠，避免过度占用CPU
                time.sleep(0.5)
                
        except Exception as e:
            logger.error(f"日志WebSocket处理错误: {str(e)}")
            try:
                ws.send(json.dumps({
                    "type": "error",
                    "message": f"日志WebSocket处理错误: {str(e)}"
                }))
            except:
                pass
        finally:
            logger.info("日志WebSocket连接已关闭")
    
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