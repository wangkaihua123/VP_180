"""
触摸屏监控服务 - 管理WebSocket服务器的启动和停止
"""
import threading
import logging
from utils.touch_monitor_ssh import TouchMonitor

logger = logging.getLogger(__name__)

class TouchMonitorService:
    _instance = None
    _monitor = None
    _thread = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TouchMonitorService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._monitor = TouchMonitor()
        
    def start(self):
        """启动WebSocket服务器"""
        if self._thread and self._thread.is_alive():
            logger.info("触摸屏监控服务已在运行")
            return
            
        try:
            logger.info("正在启动触摸屏监控服务...")
            self._thread = threading.Thread(target=self._monitor.run_server, daemon=True)
            self._thread.start()
            logger.info("触摸屏监控服务已启动")
        except Exception as e:
            logger.error(f"启动触摸屏监控服务失败: {str(e)}")
            raise
            
    def stop(self):
        """停止WebSocket服务器"""
        if not self._thread or not self._thread.is_alive():
            logger.info("触摸屏监控服务未运行")
            return
            
        try:
            logger.info("正在停止触摸屏监控服务...")
            if self._monitor:
                self._monitor.stop_server()
            self._thread.join(timeout=5)
            logger.info("触摸屏监控服务已停止")
        except Exception as e:
            logger.error(f"停止触摸屏监控服务失败: {str(e)}")
            raise
            
    @property
    def is_running(self):
        """检查服务是否正在运行"""
        return bool(self._thread and self._thread.is_alive()) 