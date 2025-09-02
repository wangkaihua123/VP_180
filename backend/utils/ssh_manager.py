"""
SSH连接管理模块

该模块专门负责通过系统OpenSSH管理与设备的SSH连接。主要功能包括：
1. 建立通过OpenSSH的SSH连接
2. 执行远程命令
3. 提供基本的连接管理

主要类：
- SSHManager: 负责通过OpenSSH的SSH连接的创建和管理
"""

import paramiko
import json
import os
import logging
from .log_config import setup_logger
import time
import socket
import subprocess

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
    # 默认设置为OpenSSH配置
    return {
        "sshHost": "",  # 远程设备IP地址
        "sshPort": 22,  # 标准SSH端口
        "sshUsername": "root",
        "sshPassword": ""
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
            # 从设置文件加载SSH参数 - 针对OpenSSH优化默认值
            settings = load_settings()
            self.hostname = settings.get("sshHost", "")  # 远程设备IP地址
            self.username = settings.get("sshUsername", "root")
            self.password = settings.get("sshPassword", "")
            self.port = settings.get("sshPort", 22)  # 标准SSH端口
            self.initialized = True
            logger.debug(f"OpenSSH管理器初始化完成，使用设置: host={self.hostname}, port={self.port}, username={self.username}")
            
            # 不在初始化时立即建立连接，等待用户配置后再连接
            # 只有在配置了必要参数时才尝试连接
            if self.hostname and self.username:
                self.connect()
    
    def connect(self):
        """建立SSH连接"""
        try:
            # 检查是否配置了必要参数
            if not self.hostname or not self.username:
                logger.error("缺少必要的SSH连接参数: hostname或username")
                return None
                
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
            
            # 配置连接参数，特别针对OpenSSH优化
            self._ssh_client.connect(
                hostname=self.hostname,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=10,  # 标准SSH连接超时时间
                banner_timeout=10,  # banner超时时间
                auth_timeout=15,  # 认证超时时间
                look_for_keys=False,  # 不查找密钥文件
                allow_agent=False,  # 不使用SSH代理
            )
            
            # 配置TCP keepalive，优化连接稳定性
            transport = self._ssh_client.get_transport()
            if transport:
                transport.set_keepalive(60)  # 每60秒发送keepalive包
            
            logger.info(f"成功通过OpenSSH连接到 {self.hostname}:{self.port}")
            return self._ssh_client
            
        except Exception as e:
            logger.error(f"OpenSSH连接失败: {str(e)}")
            return None
    
    def disconnect(self):
        """断开SSH连接"""
        try:
            if self._ssh_client:
                self._ssh_client.close()
                self._ssh_client = None
                logger.info("OpenSSH连接已断开")
        except Exception as e:
            logger.error(f"断开OpenSSH连接时出错: {str(e)}")
    
    def execute_command(self, command, timeout=None):
        """通过OpenSSH执行命令
        
        Args:
            command: 要执行的命令
            timeout: 命令执行超时时间（秒）
            
        Returns:
            命令执行结果
        """
        try:
            # 确保连接有效
            if not self._ssh_client:
                logger.warning("OpenSSH连接未建立，尝试连接...")
                if not self.connect():
                    raise Exception("无法建立OpenSSH连接")
            
            logger.debug(f"通过OpenSSH执行命令: {command}")
            
            # 执行命令
            stdin, stdout, stderr = self._ssh_client.exec_command(command, timeout=timeout)
            
            # 读取输出
            result = stdout.read().decode('utf-8', errors='ignore').strip()
            error = stderr.read().decode('utf-8', errors='ignore').strip()
            
            if error:
                logger.warning(f"命令执行警告: {error}")
            
            return result
            
        except Exception as e:
            logger.error(f"通过OpenSSH执行命令时出错: {str(e)}")
            raise
    
    def get_sftp_client(self):
        """获取SFTP客户端，用于文件传输"""
        try:
            # 确保连接有效
            if not self._ssh_client:
                logger.warning("OpenSSH连接未建立，尝试连接...")
                if not self.connect():
                    raise Exception("无法建立OpenSSH连接")
            
            return self._ssh_client.open_sftp()
            
        except Exception as e:
            logger.error(f"获取OpenSSH SFTP客户端时出错: {str(e)}")
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
    def update_settings(cls, settings):
        """更新SSH设置并重新连接
        
        Args:
            settings: 包含SSH连接设置的字典
        """
        instance = cls.get_instance()
        
        # 更新连接参数
        instance.hostname = settings.get("host", "")
        instance.username = settings.get("username", "root")
        instance.password = settings.get("password", "")
        instance.port = settings.get("port", 22)
        
        # 断开现有连接
        instance.disconnect()
        
        # 如果配置了必要参数，则尝试重新连接
        if instance.hostname and instance.username:
            logger.info(f"SSH设置已更新，尝试重新连接到 {instance.hostname}:{instance.port}")
            return instance.connect()
        else:
            logger.info("SSH设置已更新，但缺少必要参数，不进行连接")
            return None
    
    @classmethod
    def disconnect_all(cls):
        """断开所有连接"""
        try:
            # 断开OpenSSH连接
            instance = cls.get_instance()
            instance.disconnect()
            
            logger.info("所有OpenSSH连接已断开")
        except Exception as e:
            logger.error(f"断开所有OpenSSH连接时出错: {str(e)}")
    
    def __del__(self):
        """析构函数，确保资源正确释放"""
        try:
            self.disconnect()
        except:
            pass