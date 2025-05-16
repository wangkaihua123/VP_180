"""
SSH服务 - 处理SSH连接测试和相关操作
"""
import logging
import paramiko
import socket
from utils.ssh_manager import SSHManager
from backend.models.settings import Settings

logger = logging.getLogger(__name__)

class SSHService:
    """SSH服务类，处理SSH连接测试和操作"""
    
    @staticmethod
    def test_connection(ssh_settings):
        """测试SSH连接"""
        host = ssh_settings.get('host')
        port = int(ssh_settings.get('port', 22))
        username = ssh_settings.get('username')
        password = ssh_settings.get('password')

        logger.info(f"尝试连接 SSH: {host}:{port} with user {username}")

        try:
            # 创建传输层
            logger.debug("创建 SSH 传输层...")
            transport = paramiko.Transport((host, port))
            transport.start_client()

            logger.debug("尝试密码认证...")
            transport.auth_password(username, password)

            if transport.is_authenticated():
                logger.debug("认证成功，创建 SSH 会话...")
                # 创建 SSH 会话
                ssh = paramiko.SSHClient()
                ssh._transport = transport
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

                logger.debug("执行测试命令...")
                # 测试执行简单命令
                stdin, stdout, stderr = ssh.exec_command('echo "Test connection successful"', timeout=5)
                output = stdout.read().decode()
                error = stderr.read().decode()

                if error:
                    logger.error(f"命令执行出现错误: {error}")
                    raise Exception(f"命令执行错误: {error}")

                logger.info(f"命令执行成功，输出: {output}")

                # 更新全局SSHManager实例
                ssh_manager = SSHManager.get_instance()
                # 更新SSHManager的连接配置
                ssh_manager.hostname = host
                ssh_manager.port = port
                ssh_manager.username = username
                ssh_manager.password = password
                # 更新连接客户端
                SSHManager._ssh_client = ssh
                logger.info("已更新SSHManager的连接实例")

                # 注意：不再关闭连接，让SSHManager管理它

                return {
                    'success': True,
                    'message': '连接成功',
                    'diagnostics': {
                        'authentication': True,
                        'commandExecution': True,
                        'networkConnectivity': True,
                        'sshService': True,
                        'errorType': None,
                        'errorDetails': None
                    },
                    'output': output
                }
            else:
                logger.warning("认证失败")
                raise paramiko.AuthenticationException("认证失败")

        except socket.timeout:
            logger.error(f"连接超时: {host}:{port}")
            return {
                'success': False,
                'message': '连接超时，请检查主机地址和端口是否正确',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': False,
                    'sshService': False,
                    'errorType': 'connection_timeout',
                    'errorDetails': '连接超时'
                }
            }
        except paramiko.AuthenticationException as e:
            logger.error(f"认证失败: {str(e)}")
            return {
                'success': False,
                'message': '认证失败，请检查用户名和密码是否正确',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': True,
                    'sshService': True,
                    'errorType': 'authentication_failed',
                    'errorDetails': '认证失败'
                }
            }
        except paramiko.SSHException as e:
            logger.error(f"SSH 异常: {str(e)}")
            return {
                'success': False,
                'message': f'SSH 连接错误: {str(e)}',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': True,
                    'sshService': False,
                    'errorType': 'ssh_error',
                    'errorDetails': str(e)
                }
            }
        except Exception as e:
            logger.error(f"未知错误: {str(e)}")
            return {
                'success': False,
                'message': f'连接失败: {str(e)}',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': False,
                    'sshService': False,
                    'errorType': 'unknown_error',
                    'errorDetails': str(e)
                }
            }
    
    @staticmethod
    def get_settings():
        """获取SSH设置"""
        return Settings.get_ssh_settings()
    
    @staticmethod
    def update_settings(ssh_data):
        """更新SSH设置"""
        return Settings.update_ssh_settings(ssh_data)
    
    @staticmethod
    def get_client():
        """获取SSH客户端
        
        Returns:
            paramiko.SSHClient: 有效的SSH客户端连接
            None: 如果无法获取有效连接
        """
        try:
            # 获取SSHManager单例
            ssh_manager = SSHManager.get_instance()
            
            # 检查现有连接状态
            if not SSHManager.is_connected():
                logger.info("SSH未连接或连接已断开，尝试重新连接")
                client = ssh_manager.reconnect()
            else:
                client = SSHManager.get_client()
                
            if not client:
                logger.error("无法获取有效的SSH连接")
                return None
                
            return client
            
        except Exception as e:
            logger.error(f"获取SSH客户端时出错: {str(e)}")
            return None 