"""
SSH连接管理模块

该模块负责管理与设备的SSH连接。主要功能包括：
1. 建立和维护SSH连接
2. 执行远程命令
3. 处理连接异常和重连
4. 提供连接状态管理

主要类：
- SSHManager: 负责SSH连接的创建、管理和维护
- SSHConnectionService: 负责维护SSH连接的后台服务
"""

import paramiko
import json
import os
import logging
from .log_config import setup_logger
import time
import threading
import socket
import random

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
    return {
        "sshHost": "10.0.18.1", 
        "sshPort": 22, 
        "sshUsername": "root", 
        "sshPassword": "firefly"
    }

# 添加新的后台服务类
class SSHConnectionService:
    """
    SSH连接维护服务，在后台运行以保持SSH连接的稳定性
    """
    _instance = None
    _running = False
    _service_thread = None
    _check_interval = 60  # 每60秒检查一次连接状态
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 只在第一次初始化
        if not hasattr(self, 'initialized'):
            self.initialized = True
            logger.debug("SSH连接服务初始化完成")
    
    def start(self):
        """启动SSH连接维护服务"""
        if self.__class__._running:
            logger.debug("SSH连接服务已在运行中")
            return
            
        self.__class__._running = True
        self.__class__._service_thread = threading.Thread(target=self._service_loop, daemon=True)
        self.__class__._service_thread.start()
        logger.info("SSH连接维护服务已启动")
        
        # 立即尝试建立初始连接
        SSHManager.preconnect()
    
    def stop(self):
        """停止SSH连接维护服务"""
        self.__class__._running = False
        if self.__class__._service_thread and self.__class__._service_thread.is_alive():
            self.__class__._service_thread.join(timeout=1)
        logger.info("SSH连接维护服务已停止")
    
    def _service_loop(self):
        """服务主循环，定期检查并维护SSH连接"""
        while self.__class__._running:
            try:
                # 检查SSH连接状态
                if not SSHManager.is_connected():
                    logger.info("SSH连接维护服务检测到连接断开，尝试重新连接")
                    SSHManager.get_instance().reconnect()
                else:
                    # 如果连接正常，记录健康状态
                    logger.debug("SSH连接维护服务检测到连接正常")
                    
                # 等待下一次检查
                time.sleep(self.__class__._check_interval)
            except Exception as e:
                logger.error(f"SSH连接维护服务异常: {e}")
                time.sleep(10)  # 出错后短暂等待
    
    @classmethod
    def get_instance(cls):
        """获取服务实例"""
        if cls._instance is None:
            cls._instance = SSHConnectionService()
        return cls._instance

class SSHManager:
    # 类变量，用于单例模式，确保所有实例共享
    _instance = None
    _ssh_client = None
    
    # 连接重试状态跟踪
    _connection_attempts = 0
    _max_retries = 5  # 增加最大重试次数
    _retry_interval = 4  # 重试间隔（秒）
    
    # 心跳检测配置
    _heartbeat_interval = 30  # 增加心跳检测间隔（秒）
    _heartbeat_timeout = 5  # 心跳超时时间（秒）
    _heartbeat_thread = None
    _stop_heartbeat = False
    
    # TCP Keepalive配置
    _keepalive_interval = 30  # 每30秒发送一次keepalive包
    _keepalive_count = 3     # 尝试3次后判断连接断开
    
    # 添加连接状态变量
    _is_connected = False
    _last_error = None
    _last_connection_time = None
    _connection_lock = threading.Lock()
    
    # 控制通道复用
    _control_path = None
    _channel_timeout = 300  # 通道超时时间（秒）

    # 添加连接监控统计
    _connection_stats = {
        "total_attempts": 0,
        "successful_connections": 0,
        "failed_connections": 0,
        "last_successful_connection": None,
        "connection_errors": {},
        "command_executions": 0
    }

    # 添加会话保持配置
    _session_keep_alive = True
    _session_keep_alive_interval = 60  # 会话保持间隔（秒）
    _session_keep_alive_thread = None
    _stop_session_keep_alive = False

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
            
            # 启动心跳检测线程
            self._start_heartbeat()
            
            # 启动会话保持线程
            self._start_session_keep_alive()
    
    def _start_heartbeat(self):
        """启动心跳检测线程"""
        if self._heartbeat_thread is None or not self._heartbeat_thread.is_alive():
            self._stop_heartbeat = False
            self._heartbeat_thread = threading.Thread(target=self._heartbeat_check, daemon=True)
            self._heartbeat_thread.start()
            logger.debug("心跳检测线程已启动")

    def _stop_heartbeat(self):
        """停止心跳检测线程"""
        self._stop_heartbeat = True
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            self._heartbeat_thread.join(timeout=1)
            logger.debug("心跳检测线程已停止")

    def _heartbeat_check(self):
        """心跳检测主循环"""
        while not self._stop_heartbeat:
            if self._ssh_client and self._is_connected:
                try:
                    # 使用传输层的is_active检查而不是执行命令
                    transport = self._ssh_client.get_transport()
                    if transport:
                        # 设置更积极的TCP keepalive
                        transport.set_keepalive(self._keepalive_interval)
                        
                        # 只有当传输层不活跃时才执行命令检查
                        if not transport.is_active():
                            # 不记录传输层不活跃的日志
                            stdin, stdout, stderr = self._ssh_client.exec_command(
                                "echo ping",
                                timeout=self._heartbeat_timeout
                            )
                            response = stdout.read().decode().strip()
                            
                            if response != "ping":
                                # 不记录心跳检测响应异常的日志
                                self._handle_connection_failure()
                    else:
                        # 不记录SSH传输层不存在的日志
                        self._handle_connection_failure()
                except Exception as e:
                    # 降低日志级别，避免频繁输出错误日志
                    logger.debug(f"心跳检测失败: {e}")
                    self._handle_connection_failure()
            
            # 等待下一次心跳检测，添加随机抖动避免同步
            jitter = random.uniform(0.8, 1.2)
            time.sleep(self._heartbeat_interval * jitter)

    def _handle_connection_failure(self):
        """处理连接失败情况"""
        with self._connection_lock:
            self._is_connected = False
            if self._connection_attempts < self._max_retries:
                logger.info("检测到连接断开，尝试重新连接...")
                self.reconnect()
            else:
                logger.error("重连次数超过最大限制，停止重试")

    @classmethod
    def get_instance(cls):
        """获取SSHManager实例"""
        if cls._instance is None:
            cls._instance = SSHManager()
        return cls._instance

    @classmethod
    def get_client(cls):
        """获取已存在的SSH客户端或创建新的"""
        instance = cls.get_instance()

        with cls._instance._connection_lock:
            # 如果客户端存在，先尝试返回现有客户端
            if cls._ssh_client:
                # 简单检查传输层是否存在
                transport = cls._ssh_client.get_transport()
                if transport and transport.is_active():
                    cls._is_connected = True
                    return cls._ssh_client

            # 如果连接无效，尝试重新连接
            logger.debug("SSH客户端不存在或传输层不活动，尝试重新连接")
            return instance.reconnect()
    
    @classmethod
    def is_connected(cls):
        """检查SSH连接是否有效并活动"""
        # 检查客户端是否存在
        if not cls._ssh_client:
            cls._is_connected = False
            return False

        # 检查传输层是否存在且活动
        transport = cls._ssh_client.get_transport()
        if not transport or not transport.is_active():
            logger.debug("SSH传输层不存在或不活动")
            cls._is_connected = False
            return False

        # 如果连接是最近建立的（5秒内），直接认为有效，避免频繁检查
        if cls._last_connection_time and (time.time() - cls._last_connection_time) < 5:
            cls._is_connected = True
            return True

        # 大多数情况下，如果传输层活动，我们认为连接是有效的
        cls._is_connected = True
        return True

    def reconnect(self):
        """重新连接SSH"""
        # 使用指数退避算法计算等待时间
        if self.__class__._connection_attempts > 0:
            # 基础等待时间为重试间隔的2的(尝试次数-1)次方
            backoff = self.__class__._retry_interval * (2 ** (self.__class__._connection_attempts - 1))
            # 添加随机抖动，避免多个客户端同时重连
            jitter = random.uniform(0.5, 1.0)
            wait_time = backoff * jitter
            # 限制最大等待时间为30秒
            wait_time = min(wait_time, 30)
            logger.debug(f"使用指数退避等待 {wait_time:.2f} 秒后重试连接")
            time.sleep(wait_time)
        
        # 关闭现有连接
        self.disconnect()
        
        # 重置连接尝试计数（如果超过最大重试次数）
        if self.__class__._connection_attempts >= self.__class__._max_retries:
            self.__class__._connection_attempts = 0
            
        # 尝试连接
        return self.connect()

    def connect(self):
        """建立SSH连接，根据设置的最大重试次数尝试"""
        # 记录连接时间
        self.__class__._last_connection_time = time.time()
        
        # 更新连接统计
        self.__class__._connection_stats["total_attempts"] += 1
        
        # 重新检查连接，避免不必要的重连
        if self.__class__.is_connected():
            logger.debug("SSH已连接且活动")
            return self.__class__._ssh_client

        # 重新读取设置，确保使用最新的参数
        settings = load_settings()
        self.hostname = settings.get("sshHost", self.hostname)
        self.username = settings.get("sshUsername", self.username)
        self.password = settings.get("sshPassword", self.password)
        self.port = settings.get("sshPort", self.port)

        # 增加连接尝试计数
        self.__class__._connection_attempts += 1
        attempt_number = self.__class__._connection_attempts
        
        logger.debug(f"尝试SSH连接 (第{attempt_number}次)")
        
        try:
            # 关闭可能存在的旧连接
            if self.__class__._ssh_client:
                try:
                    logger.debug("关闭可能存在的旧连接")
                    self.__class__._ssh_client.close()
                except:
                    pass
            
            # 创建新的连接
            self.__class__._ssh_client = paramiko.SSHClient()
            self.__class__._ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # 设置更长的初始连接超时时间
            connect_timeout = 15  # 增加到15秒
            
            # 尝试连接
            try:
                self.__class__._ssh_client.connect(
                    hostname=self.hostname,
                    username=self.username,
                    password=self.password,
                    port=self.port,
                    timeout=connect_timeout,
                    banner_timeout=15,  # 增加banner超时
                    auth_timeout=15,    # 增加认证超时
                    look_for_keys=False,  # 不查找密钥，加快连接速度
                    allow_agent=False     # 不使用SSH代理，加快连接速度
                )
            except paramiko.ssh_exception.SSHException as e:
                # 特殊处理SSH协议banner错误
                if "Error reading SSH protocol banner" in str(e):
                    # 不记录SSH协议banner读取错误的日志
                    # 使用更长的超时时间重试
                    self.__class__._ssh_client.connect(
                        hostname=self.hostname,
                        username=self.username,
                        password=self.password,
                        port=self.port,
                        timeout=30,           # 延长超时时间
                        banner_timeout=30,    # 延长banner超时
                        auth_timeout=15,
                        look_for_keys=False,
                        allow_agent=False
                    )
                else:
                    raise
            
            # 获取传输层并配置
            transport = self.__class__._ssh_client.get_transport()
            
            # 设置更积极的TCP keepalive
            transport.set_keepalive(self.__class__._keepalive_interval)
            
            # 设置socket选项以启用TCP keepalive
            sock = transport.sock
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            
            # 在支持的平台上设置更多TCP keepalive选项
            # TCP_KEEPIDLE: 空闲多久后开始发送keepalive包
            # TCP_KEEPINTVL: 两次keepalive探测间的间隔
            # TCP_KEEPCNT: 探测失败多少次后断开连接
            try:
                if hasattr(socket, 'TCP_KEEPIDLE'):
                    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, self.__class__._keepalive_interval)
                if hasattr(socket, 'TCP_KEEPINTVL'):
                    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 5)
                if hasattr(socket, 'TCP_KEEPCNT'):
                    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, self.__class__._keepalive_count)
            except (AttributeError, OSError) as e:
                logger.debug(f"无法设置某些TCP keepalive选项: {e}")
            
            # 连接成功，重置计数器和状态
            logger.info("SSH连接成功")
            self.__class__._connection_attempts = 0
            self.__class__._is_connected = True
            self.__class__._last_error = None
            self.__class__._last_connection_time = time.time()

            # 更新连接统计
            self.__class__._connection_stats["successful_connections"] += 1
            self.__class__._connection_stats["last_successful_connection"] = time.time()

            return self.__class__._ssh_client
        except Exception as e:
            # 不记录连接失败的日志，特别是 "Error reading SSH protocol banner" 错误
            
            # 更新错误状态
            self.__class__._is_connected = False
            self.__class__._last_error = str(e)
            
            # 更新连接统计
            self.__class__._connection_stats["failed_connections"] += 1
            error_type = type(e).__name__
            if error_type not in self.__class__._connection_stats["connection_errors"]:
                self.__class__._connection_stats["connection_errors"][error_type] = 0
            self.__class__._connection_stats["connection_errors"][error_type] += 1
            
            # 如果还有重试机会，等待后重试
            if attempt_number < self.__class__._max_retries:
                return self.connect()
            else:
                # 不记录连接失败的日志
                self.__class__._connection_attempts = 0
                return None

    def force_reconnect(self):
        """强制重新连接SSH"""
        logger.debug("强制重新连接SSH")
        return self.reconnect()
    
    def disconnect(self):
        """关闭SSH连接"""
        if self.__class__._ssh_client:
            try:
                logger.debug("正在关闭SSH连接")
                self.__class__._ssh_client.close()
                self.__class__._ssh_client = None
                self.__class__._is_connected = False
                logger.debug("SSH连接已关闭")
            except Exception as e:
                logger.error(f"关闭SSH连接时出错: {e}")
    
    @classmethod
    def get_connection_status(cls):
        """获取连接状态信息"""
        connected = cls.is_connected()
        return {
            "connected": connected,
            "last_error": cls._last_error if not connected else None,
            "attempts": cls._connection_attempts,
            "max_retries": cls._max_retries,
            "stats": cls._connection_stats
        }
    
    def execute_command(self, command):
        """执行SSH命令"""
        if not self.__class__._ssh_client:
            logger.error("SSH连接未建立，无法执行命令")
            return None
        
        try:
            # 确保连接有效
            if not self.__class__.is_connected():
                logger.warning("SSH连接不活动，尝试重新连接")
                self.connect()
                if not self.__class__._ssh_client:
                    logger.error("重新连接失败，无法执行命令")
                    return None
            
            # 使用更长的命令执行超时
            stdin, stdout, stderr = self.__class__._ssh_client.exec_command(command, timeout=30)
            result = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            
            if error:
                logger.warning(f"命令执行产生错误: {error}")
            
            # 成功执行命令，重置连接尝试计数
            self.__class__._connection_attempts = 0
            
            # 更新命令执行统计
            self.__class__._connection_stats["command_executions"] += 1
            
            return result
        except Exception as e:
            logger.error(f"执行命令时出错: {e}")
            # 记录连接状态
            self.__class__._is_connected = False
            self.__class__._last_error = str(e)
            return None

    @classmethod
    def disconnect_all(cls):
        """全局断开SSH连接"""
        # 停止连接维护服务
        service = SSHConnectionService.get_instance()
        service.stop()
        
        # 停止所有后台线程
        if cls._instance:
            cls._instance._stop_heartbeat = True
            cls._instance._stop_session_keep_alive = True
            
        if cls._ssh_client:
            try:
                logger.debug("正在全局断开SSH连接")
                cls._ssh_client.close()
                cls._ssh_client = None
                cls._is_connected = False
                logger.debug("全局SSH连接已断开")
            except Exception as e:
                logger.error(f"全局断开SSH连接时出错: {e}")
        cls._instance = None

    @classmethod
    def get_diagnostics(cls):
        """获取连接诊断信息"""
        transport = None
        if cls._ssh_client:
            transport = cls._ssh_client.get_transport()
        
        diagnostics = {
            "is_connected": cls._is_connected,
            "transport_active": transport.is_active() if transport else False,
            "last_connection_time": cls._last_connection_time,
            "keepalive_interval": cls._keepalive_interval,
            "heartbeat_interval": cls._heartbeat_interval,
            "connection_stats": cls._connection_stats,
            "last_error": cls._last_error
        }
        
        # 检查网络连接
        try:
            if cls._instance:
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(3)
                result = s.connect_ex((cls._instance.hostname, cls._instance.port))
                diagnostics["network_reachable"] = (result == 0)
                s.close()
            else:
                diagnostics["network_reachable"] = False
        except:
            diagnostics["network_reachable"] = False
            
        return diagnostics 

    def _start_session_keep_alive(self):
        """启动会话保持线程"""
        if self._session_keep_alive and (self._session_keep_alive_thread is None or not self._session_keep_alive_thread.is_alive()):
            self._stop_session_keep_alive = False
            self._session_keep_alive_thread = threading.Thread(target=self._session_keep_alive_check, daemon=True)
            self._session_keep_alive_thread.start()
            logger.debug("会话保持线程已启动")
    
    def _stop_session_keep_alive_thread(self):
        """停止会话保持线程"""
        self._stop_session_keep_alive = True
        if self._session_keep_alive_thread and self._session_keep_alive_thread.is_alive():
            self._session_keep_alive_thread.join(timeout=1)
            logger.debug("会话保持线程已停止")
    
    def _session_keep_alive_check(self):
        """会话保持主循环，定期发送无害命令保持会话活跃"""
        while not self._stop_session_keep_alive:
            # 如果连接存在且活跃，发送会话保持命令
            if self.__class__._ssh_client and self.__class__._is_connected:
                try:
                    # 使用传输层的is_active检查
                    transport = self.__class__._ssh_client.get_transport()
                    if transport and transport.is_active():
                        # 发送无害命令保持会话活跃
                        logger.debug("发送会话保持命令")
                        stdin, stdout, stderr = self.__class__._ssh_client.exec_command(
                            ":", # 空命令，几乎不消耗资源
                            timeout=5
                        )
                        stdout.read()  # 读取输出以确保命令完成
                except Exception as e:
                    logger.warning(f"会话保持命令失败: {e}")
                    # 不触发重连，让心跳检测处理
            
            # 等待下一次会话保持检查，添加随机抖动
            jitter = random.uniform(0.9, 1.1)
            time.sleep(self.__class__._session_keep_alive_interval * jitter)
    
    @classmethod
    def preconnect(cls):
        """预先建立连接，确保后续操作可以快速执行"""
        instance = cls.get_instance()
        
        # 如果已经连接，直接返回
        if cls.is_connected():
            logger.debug("SSH已连接，无需预连接")
            return cls._ssh_client
            
        # 尝试建立新连接
        logger.info("正在预先建立SSH连接")
        return instance.connect()
    
    @classmethod
    def reset_connection_state(cls):
        """重置连接状态，用于解决卡死状态"""
        logger.info("重置SSH连接状态")
        
        # 重置连接状态变量
        cls._is_connected = False
        cls._connection_attempts = 0
        cls._last_error = None
        
        # 关闭现有连接
        if cls._ssh_client:
            try:
                cls._ssh_client.close()
            except:
                pass
            cls._ssh_client = None
            
        # 重置统计数据
        cls._connection_stats["total_attempts"] = 0
        cls._connection_stats["failed_connections"] = 0
        
        # 重新连接
        instance = cls.get_instance()
        return instance.connect()

    @classmethod
    def initialize_connection(cls):
        """初始化SSH连接并启动维护服务"""
        # 启动连接维护服务
        service = SSHConnectionService.get_instance()
        service.start()
        
        # 预先建立连接
        return cls.preconnect() 