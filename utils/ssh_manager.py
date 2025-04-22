import paramiko
import json
import os
from .log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

# 读取设置文件
def load_settings():
    settings_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'settings.json')
    try:
        if os.path.exists(settings_file):
            with open(settings_file, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"读取设置文件失败: {e}")
    return {
        "sshHost": "10.0.18.1", 
        "sshPort": 22, 
        "sshUsername": "root", 
        "sshPassword": "firefly"
    }

class SSHManager:
    # 类变量，用于单例模式，确保所有实例共享
    _instance = None
    _ssh_client = None
    
    # 连接重试状态跟踪
    _connection_attempts = 0
    _max_retries = 1  # 最多尝试2次 (初始尝试 + 1次重试)

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # 只在第一次初始化
        if not hasattr(self, 'initialized'):
            # 从设置文件加载SSH参数
            settings = load_settings()
            self.hostname = settings.get("sshHost", "10.0.18.1")
            self.username = settings.get("sshUsername", "root")
            self.password = settings.get("sshPassword", "firefly")
            self.port = settings.get("sshPort", 22)
            self.initialized = True
            logger.debug(f"SSH管理器初始化完成，使用设置: host={self.hostname}, port={self.port}, username={self.username}")
    
    @classmethod
    def get_instance(cls):
        """获取SSHManager实例"""
        if cls._instance is None:
            cls._instance = SSHManager()
        return cls._instance

    @classmethod
    def get_client(cls):
        """获取已存在的SSH客户端或创建新的"""
        # 检查现有连接是否有效
        if cls._ssh_client and cls._ssh_client.get_transport() and cls._ssh_client.get_transport().is_active():
            logger.debug("返回现有SSH连接")
            return cls._ssh_client
        
        # 获取或创建实例
        instance = cls.get_instance()
        
        # 重置连接尝试计数
        if cls._connection_attempts > cls._max_retries:
            cls._connection_attempts = 0
            
        # 尝试连接
        return instance.connect()

    def connect(self):
        """建立SSH连接，最多尝试两次"""
        # 检查现有连接是否有效
        if self._ssh_client and self._ssh_client.get_transport() and self._ssh_client.get_transport().is_active():
            logger.debug("SSH已连接")
            return self._ssh_client

        # 重新读取设置，确保使用最新的参数
        settings = load_settings()
        self.hostname = settings.get("sshHost", self.hostname)
        self.username = settings.get("sshUsername", self.username)
        self.password = settings.get("sshPassword", self.password)
        self.port = settings.get("sshPort", self.port)

        # 增加连接尝试计数
        self.__class__._connection_attempts += 1
        attempt_number = self.__class__._connection_attempts
        
        try:
            self._ssh_client = paramiko.SSHClient()
            self._ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self._ssh_client.connect(
                hostname=self.hostname,
                username=self.username,
                password=self.password,
                port=self.port,
                timeout=10  # 设置10秒超时
            )
            
            # 连接成功，重置计数器
            logger.info("SSH连接成功")
            self.__class__._connection_attempts = 0
            
            return self._ssh_client
        except Exception as e:
            # 根据尝试次数记录不同的日志
            if attempt_number == 1:
                logger.error(f"第一次ssh连接失败: {e}")
            else:
                logger.error(f"第二次ssh连接失败: {e}")
            
            # 如果已尝试次数达到或超过最大重试次数，重置计数器
            if attempt_number > self.__class__._max_retries:
                self.__class__._connection_attempts = 0
                
            return None
    
    def disconnect(self):
        """关闭SSH连接"""
        if self._ssh_client:
            try:
                self._ssh_client.close()
                self._ssh_client = None
                logger.debug("SSH连接已关闭")
            except Exception as e:
                logger.error(f"关闭SSH连接时出错: {e}")
    
    def execute_command(self, command):
        """执行SSH命令"""
        if not self._ssh_client:
            logger.error("SSH连接未建立，无法执行命令")
            return None
        
        try:
            # 确保连接有效
            if not self._ssh_client.get_transport() or not self._ssh_client.get_transport().is_active():
                logger.warning("SSH连接已关闭，尝试重新连接")
                self.connect()
                if not self._ssh_client:
                    logger.error("重新连接失败，无法执行命令")
                    return None
            
            stdin, stdout, stderr = self._ssh_client.exec_command(command)
            result = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            
            if error:
                logger.warning(f"命令执行产生错误: {error}")
            
            return result
        except Exception as e:
            logger.error(f"执行命令时出错: {e}")
            return None 