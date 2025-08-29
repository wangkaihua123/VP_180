"""
SSH连接SSH服务 - 专门处理通过SSH连接的SSH连接
"""
import logging
import paramiko
import socket
import time
from utils.ssh_manager import SSHManager

# 禁止 paramiko 库的错误日志输出
paramiko_logger = logging.getLogger('paramiko.transport')
paramiko_logger.setLevel(logging.CRITICAL)

logger = logging.getLogger(__name__)

class SSHService:
    """SSH连接SSH服务类，专门处理通过SSH连接的SSH连接"""
    
    @staticmethod
    def test_connection(ssh_settings):
        """
        测试通过SSH连接的SSH连接
        
        Args:
            ssh_settings (dict): SSH连接配置，包含以下字段：
                - host: SSH连接主机地址（通常是localhost或127.0.0.1）
                - port: SSH连接端口号
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

        logger.info(f"尝试通过SSH连接SSH: {host}:{port} with user {username}")

        try:
            # 首先测试网络连接
            logger.debug(f"测试SSH连接网络连接到 {host}:{port}...")
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)  # 10秒超时
            result = sock.connect_ex((host, port))
            sock.close()

            if result != 0:
                logger.error(f"无法连接到SSH连接 {host}:{port}，错误代码: {result}")
                return {
                    'success': False,
                    'message': f'无法连接到SSH连接 {host}:{port}，请确保SSH连接已启动并正确配置',
                    'diagnostics': {
                        'authentication': False,
                        'commandExecution': False,
                        'networkConnectivity': False,
                        'sshService': False,
                        'errorType': 'tunnel_unreachable',
                        'errorDetails': f'SSH连接被拒绝或不可达，错误代码: {result}'
                    }
                }

            logger.debug("SSH连接网络连接正常，创建 SSH 客户端...")
            # 创建SSH客户端
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            logger.debug("尝试通过SSH连接和认证...")
            ssh.connect(
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=10,
                auth_timeout=10
            )

            if ssh.get_transport() and ssh.get_transport().is_authenticated():
                logger.debug("通过SSH连接认证成功，获取传输层...")
                transport = ssh.get_transport()

                # 设置 TCP keepalive
                transport.set_keepalive(60)  # 每60秒发送一个心跳包

                logger.debug("执行测试命令...")
                # 测试执行简单命令
                _, stdout, stderr = ssh.exec_command('echo "MobaXterm tunnel connection successful"', timeout=5)
                output = stdout.read().decode()
                error = stderr.read().decode()

                if error:
                    logger.error(f"命令执行出现错误: {error}")
                    raise Exception(f"命令执行错误: {error}")

                logger.info(f"通过SSH连接命令执行成功，输出: {output}")

                # 更新全局SSHManager实例
                ssh_manager = SSHManager.get_instance()
                # 更新SSHManager的连接配置
                ssh_manager.hostname = host
                ssh_manager.port = port
                ssh_manager.username = username
                ssh_manager.password = password
                
                # 关闭旧的连接（如果存在）
                if ssh_manager._ssh_client:
                    try:
                        ssh_manager._ssh_client.close()
                    except:
                        pass
                
                # 更新连接客户端
                ssh_manager._ssh_client = ssh
                logger.info("已更新SSHManager的连接实例和状态（通过SSH连接）")

                return {
                    'success': True,
                    'message': '通过SSH连接成功',
                    'diagnostics': {
                        'authentication': True,
                        'commandExecution': True,
                        'networkConnectivity': True,
                        'sshService': True,
                        'errorType': None,
                        'errorDetails': None,
                        'connectionType': 'mobaxterm_tunnel'
                    },
                    'output': output
                }
            else:
                logger.warning("通过SSH连接认证失败")
                raise paramiko.AuthenticationException("通过SSH连接认证失败")

        except socket.timeout:
            logger.error(f"通过SSH连接超时: {host}:{port}")
            return {
                'success': False,
                'message': '通过SSH连接超时，请检查SSH连接是否已启动并正确配置',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': False,
                    'sshService': False,
                    'errorType': 'tunnel_connection_timeout',
                    'errorDetails': 'SSH连接超时'
                }
            }
        except paramiko.AuthenticationException as e:
            logger.error(f"通过SSH连接认证失败: {str(e)}")
            return {
                'success': False,
                'message': '通过SSH连接认证失败，请检查用户名和密码是否正确',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': True,
                    'sshService': True,
                    'errorType': 'tunnel_authentication_failed',
                    'errorDetails': '通过SSH连接认证失败'
                }
            }
        except paramiko.SSHException as e:
            logger.error(f"通过SSH连接SSH异常: {str(e)}")
            return {
                'success': False,
                'message': f'通过SSH连接错误: {str(e)}',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': True,
                    'sshService': False,
                    'errorType': 'tunnel_ssh_error',
                    'errorDetails': str(e)
                }
            }
        except Exception as e:
            logger.error(f"通过SSH连接未知错误: {str(e)}")
            return {
                'success': False,
                'message': f'通过SSH连接失败: {str(e)}',
                'diagnostics': {
                    'authentication': False,
                    'commandExecution': False,
                    'networkConnectivity': False,
                    'sshService': False,
                    'errorType': 'tunnel_unknown_error',
                    'errorDetails': str(e)
                }
            }
    
    @staticmethod
    def get_client():
        """获取通过SSH连接的SSH客户端
        
        Returns:
            paramiko.SSHClient: 有效的SSH客户端连接
            None: 如果无法获取有效连接
        """
        try:
            # 获取SSHManager单例
            ssh_manager = SSHManager.get_instance()
            
            # 获取SSH客户端，假设连接已存在
            client = SSHManager.get_client()
                
            if not client:
                logger.error("无法获取通过SSH连接的有效SSH连接")
                return None
                
            return client
            
        except Exception as e:
            logger.error(f"获取通过SSH连接的SSH客户端时出错: {str(e)}")
            return None