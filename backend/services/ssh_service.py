"""
SSH服务 - 处理SSH连接测试和相关操作
"""
import logging
import paramiko
import socket
from utils.ssh_manager import SSHManager

# 禁止 paramiko 库的错误日志输出
paramiko_logger = logging.getLogger('paramiko.transport')
paramiko_logger.setLevel(logging.CRITICAL)

logger = logging.getLogger(__name__)

class SSHService:
    """SSH服务类，处理SSH连接测试和操作"""
    
    @staticmethod
    def test_connection(ssh_settings):
        """
        测试SSH连接
        
        Args:
            ssh_settings (dict): SSH连接配置，包含以下字段：
                - host: SSH主机地址
                - port: SSH端口号
                - username: 用户名
                - password: 密码
        """
        # 验证必要参数
        required_fields = ['host', 'port', 'username', 'password']
        for field in required_fields:
            if field not in ssh_settings:
                logger.error(f"缺少必要的SSH配置参数: {field}")
                return {
                    'success': False,
                    'message': f'缺少必要的SSH配置参数: {field}',
                    'diagnostics': {
                        'authentication': False,
                        'commandExecution': False,
                        'networkConnectivity': False,
                        'sshService': False,
                        'errorType': 'missing_parameter',
                        'errorDetails': f'缺少参数: {field}'
                    }
                }

        host = ssh_settings['host']
        port = int(ssh_settings['port'])
        username = ssh_settings['username']
        password = ssh_settings['password']

        logger.info(f"尝试连接 SSH: {host}:{port} with user {username}")

        try:
            # 首先测试网络连接
            logger.debug(f"测试网络连接到 {host}:{port}...")
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)  # 10秒超时
            result = sock.connect_ex((host, port))
            sock.close()

            if result != 0:
                logger.error(f"无法连接到 {host}:{port}，错误代码: {result}")
                return {
                    'success': False,
                    'message': f'无法连接到主机 {host}:{port}，请检查主机地址、端口和网络连接',
                    'diagnostics': {
                        'authentication': False,
                        'commandExecution': False,
                        'networkConnectivity': False,
                        'sshService': False,
                        'errorType': 'network_unreachable',
                        'errorDetails': f'连接被拒绝或主机不可达，错误代码: {result}'
                    }
                }

            logger.debug("网络连接正常，创建 SSH 客户端...")
            # 创建SSH客户端
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            logger.debug("尝试连接和认证...")
            ssh.connect(
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=10,
                auth_timeout=10
            )

            if ssh.get_transport() and ssh.get_transport().is_authenticated():
                logger.debug("认证成功，获取传输层...")
                transport = ssh.get_transport()

                # 设置 TCP keepalive
                transport.set_keepalive(60)  # 每60秒发送一个心跳包

                logger.debug("执行测试命令...")
                # 测试执行简单命令
                _, stdout, stderr = ssh.exec_command('echo "Test connection successful"', timeout=5)
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