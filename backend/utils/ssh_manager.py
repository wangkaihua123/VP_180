"""
SSH连接管理模块

该模块专门负责通过SSH连接管理与设备的SSH连接。主要功能包括：
1. 建立通过SSH连接的SSH连接
2. 执行远程命令
3. 提供基本的连接管理

主要类：
- SSHManager: 负责通过SSH连接的SSH连接的创建和管理
"""

import paramiko
import json
import os
import logging
from .log_config import setup_logger
import time
import socket

# 禁止 paramiko 库的错误日志输出
paramiko_logger = logging.getLogger('paramiko.transport')
paramiko_logger.setLevel(logging.CRITICAL)

# 获取日志记录器
logger = setup_logger(__name__)

# 读取设置文件
def load_settings():
    settings_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'settings.json')
    try:
        if os.path.exists(settings_file):
            with open(settings_file, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"读取设置文件失败: {e}")
    # 默认设置为SSH连接配置
    return {
        "sshHost": "127.0.0.1",  # SSH连接通常使用localhost
        "sshPort": 2222,         # SSH连接端口
        "sshUsername": "root",
        "sshPassword": "firefly"
    }

class SSHManager:
    # 类变量，用于单例模式，确保所有实例共享同一个SSH连接
    _instance = None
    _ssh_client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 只在第一次初始化
        if not hasattr(self, 'initialized'):
            # 从设置文件加载SSH参数 - 针对SSH连接优化默认值
            settings = load_settings()
            self.hostname = settings.get("sshHost", "127.0.0.1")  # 默认为本地隧道
            self.username = settings.get("sshUsername", "root")
            self.password = settings.get("sshPassword", "firefly")
            self.port = settings.get("sshPort", 2222)  # 默认SSH连接端口
            self.initialized = True
            logger.debug(f"SSH连接SSH管理器初始化完成，使用设置: host={self.hostname}, port={self.port}, username={self.username}")
            
            # 立即建立连接
            self.connect()
    
    def connect(self):
        """建立SSH连接"""
        try:
            # 如果已连接，直接返回
            if self._ssh_client:
                try:
                    transport = self._ssh_client.get_transport()
                    if transport and transport.is_active():
                        return self._ssh_client
                except:
                    pass
            
            # 创建新的SSH客户端
            self._ssh_client = paramiko.SSHClient()
            self._ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # 配置连接参数，特别针对SSH连接优化
            self._ssh_client.connect(
                hostname=self.hostname,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=20,  # SSH连接需要更长的超时时间
                banner_timeout=20,  # 增加banner超时时间
                auth_timeout=30,  # 增加认证超时时间
                look_for_keys=False,  # 不查找密钥文件
                allow_agent=False,  # 不使用SSH代理
            )
            
            # 配置TCP keepalive，优化隧道连接稳定性
            transport = self._ssh_client.get_transport()
            if transport:
                transport.set_keepalive(60)  # 每60秒发送keepalive包
                transport.use_compression(True)  # 启用压缩，提高隧道传输效率
            
            logger.info(f"成功通过SSH连接到 {self.hostname}:{self.port}")
            return self._ssh_client
            
        except Exception as e:
            logger.error(f"SSH连接失败: {str(e)}")
            return None
    
    def disconnect(self):
        """断开SSH连接"""
        try:
            if self._ssh_client:
                self._ssh_client.close()
                self._ssh_client = None
                logger.info("SSH连接已断开")
        except Exception as e:
            logger.error(f"断开SSH连接时出错: {str(e)}")
    
    def execute_command(self, command, timeout=None):
        """通过SSH连接执行命令
        
        Args:
            command: 要执行的命令
            timeout: 命令执行超时时间（秒）
            
        Returns:
            命令执行结果
        """
        try:
            # 确保连接有效
            if not self._ssh_client:
                logger.warning("SSH连接未建立，尝试连接...")
                if not self.connect():
                    raise Exception("无法建立SSH连接")
            
            logger.debug(f"通过SSH连接执行命令: {command}")
            
            # 执行命令
            stdin, stdout, stderr = self._ssh_client.exec_command(command, timeout=timeout)
            
            # 读取输出
            result = stdout.read().decode('utf-8', errors='ignore').strip()
            error = stderr.read().decode('utf-8', errors='ignore').strip()
            
            if error:
                logger.warning(f"命令执行警告: {error}")
            
            return result
            
        except Exception as e:
            logger.error(f"通过SSH连接执行命令时出错: {str(e)}")
            raise
    
    def get_sftp_client(self):
        """获取SFTP客户端，用于文件传输"""
        try:
            # 确保连接有效
            if not self._ssh_client:
                logger.warning("SSH连接未建立，尝试连接...")
                if not self.connect():
                    raise Exception("无法建立SSH连接")
            
            return self._ssh_client.open_sftp()
            
        except Exception as e:
            logger.error(f"获取SSH连接SFTP客户端时出错: {str(e)}")
            raise
    
    @classmethod
    def get_instance(cls):
        """获取SSHManager实例"""
        if cls._instance is None:
            cls._instance = SSHManager()
        return cls._instance
    
    @classmethod
    def get_client(cls):
        """获取SSH客户端实例"""
        instance = cls.get_instance()
        if not instance._ssh_client:
            # 如果连接无效，尝试重新连接
            instance.connect()
        return instance._ssh_client
    
    @classmethod
    def disconnect_all(cls):
        """断开所有连接"""
        try:
            # 断开SSH连接
            instance = cls.get_instance()
            instance.disconnect()
            
            logger.info("所有SSH连接已断开")
        except Exception as e:
            logger.error(f"断开所有SSH连接时出错: {str(e)}")
    
    def __del__(self):
        """析构函数，确保资源正确释放"""
        try:
            self.disconnect()
        except:
            pass