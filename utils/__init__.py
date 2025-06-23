"""
VP180 工具模块
"""

# vp_180.utils package

from .log_monitor import LogMonitor

# 在应用程序启动时自动初始化SSH连接服务
def init_ssh_connection_service():
    """初始化SSH连接服务"""
    try:
        from .ssh_manager import SSHManager
        # 在后台线程中初始化SSH连接，避免阻塞主线程
        import threading
        threading.Thread(target=SSHManager.initialize_connection, daemon=True).start()
    except ImportError as e:
        print(f"无法导入SSH管理器模块: {e}")
    except Exception as e:
        print(f"初始化SSH连接服务时出错: {e}")

# 延迟导入，避免循环导入问题
import threading
threading.Timer(1.0, init_ssh_connection_service).start()
