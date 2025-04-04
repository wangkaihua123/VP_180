import paramiko
from .log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

class SSHManager:
    _instance = None
    _ssh_client = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, hostname="10.0.18.1", username="root", password="firefly", port=22):
        # 只在第一次初始化
        if not self._ssh_client:
            self.hostname = hostname
            self.username = username
            self.password = password
            self.port = port
            logger.debug("SSH管理器初始化完成")
    
    @classmethod
    def get_instance(cls):
        """获取SSHManager实例"""
        if cls._instance is None:
            cls._instance = SSHManager()
        return cls._instance

    @classmethod
    def get_client(cls):
        """获取已存在的SSH客户端或创建新的"""
        if cls._ssh_client and cls._ssh_client.get_transport() and cls._ssh_client.get_transport().is_active():
            logger.debug("返回现有SSH连接")
            return cls._ssh_client
        
        instance = cls.get_instance()
        return instance.connect()

    def connect(self):
        """建立SSH连接"""
        if self._ssh_client and self._ssh_client.get_transport() and self._ssh_client.get_transport().is_active():
            logger.debug("SSH已连接")
            return self._ssh_client

        logger.debug("开始建立新的SSH连接...")
        try:
            self._ssh_client = paramiko.SSHClient()
            self._ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self._ssh_client.connect(
                hostname=self.hostname,
                username=self.username,
                password=self.password,
                port=self.port
            )
            logger.debug("SSH连接成功")
            return self._ssh_client
        except Exception as e:
            logger.error(f"SSH连接失败: {e}")
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
            stdin, stdout, stderr = self._ssh_client.exec_command(command)
            result = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            
            if error:
                logger.warning(f"命令执行产生错误: {error}")
            
            return result
        except Exception as e:
            logger.error(f"执行命令时出错: {e}")
            return None 