"""
OpenSSH设置路由处理模块 - 处理通过系统OpenSSH的SSH连接设置的API
"""
import os
import logging
from flask import request, jsonify
from . import ssh_bp
from utils.ssh_manager import SSHManager
from models.settings import Settings

# 设置日志
logger = logging.getLogger(__name__)


@ssh_bp.route('/settings', methods=['GET'])
def get_ssh_settings():
    """获取OpenSSH设置"""
    try:
        settings = Settings.get_ssh_settings()
        if settings:
            return jsonify({
                'success': True,
                'settings': settings,
                'connection_type': 'openssh_direct'  # 标识连接类型
            })
        return jsonify({
            'success': True,
            'settings': None,
            'connection_type': 'openssh_direct'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"获取OpenSSH设置失败: {str(e)}"
        }), 500


@ssh_bp.route('/settings', methods=['POST'])
def update_ssh_settings():
    """更新OpenSSH设置"""
    try:
        data = request.json
        success = Settings.update_ssh_settings(data)
        if success:
            return jsonify({
                'success': True,
                'settings': Settings.get_ssh_settings(),
                'message': 'OpenSSH设置已更新',
                'connection_type': 'openssh_direct'
            })
        else:
            return jsonify({
                'success': False,
                'message': "保存OpenSSH设置失败"
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"更新OpenSSH设置失败: {str(e)}"
        }), 500


@ssh_bp.route('/test', methods=['POST'])
def test_connection():
    """测试SSH连接"""
    try:
        data = request.json

        # 从请求数据中获取SSH设置
        ssh_settings = {
            'host': data.get('host'),
            'port': int(data.get('port', 22)),  # 默认标准SSH端口
            'username': data.get('username'),
            'password': data.get('password')
        }

        # 首先检查是否已经有活跃的SSH连接
        from services.ssh_service import SSHService
        from utils.ssh_manager import SSHManager

        # 获取当前连接的配置
        ssh_manager = SSHManager.get_instance()
        current_host = getattr(ssh_manager, 'hostname', None)
        current_port = getattr(ssh_manager, 'port', None)
        current_username = getattr(ssh_manager, 'username', None)

        # 检查当前连接是否与请求的配置匹配
        if (current_host == ssh_settings['host'] and
            current_port == ssh_settings['port'] and
            current_username == ssh_settings['username']):
            
            # 连接配置匹配，验证连接是否有效
            try:
                # 获取SSH客户端并执行测试命令验证连接
                ssh_client = SSHManager.get_client()
                if ssh_client:
                    # 执行简单命令测试连接
                    stdin, stdout, stderr = ssh_client.exec_command('echo "OpenSSH connection test"', timeout=10)
                    output = stdout.read().decode().strip()
                    error = stderr.read().decode().strip()
                    
                    if error:
                        logger.warning(f"现有SSH连接测试命令执行出错: {error}")
                        # 连接有问题，继续进行新的连接测试
                        pass
                    elif "OpenSSH connection test" in output:
                        # 连接确实有效
                        return jsonify({
                            'success': True,
                            'message': 'SSH连接已存在且配置匹配，连接测试成功',
                            'diagnostics': {
                                'authentication': True,
                                'commandExecution': True,
                                'networkConnectivity': True,
                                'sshService': True,
                                'errorType': None,
                                'errorDetails': None,
                                'connectionStatus': 'existing_openssh_connection',
                                'testOutput': output,
                                'connectionType': 'openssh_direct'
                            }
                        })
                    else:
                        logger.warning("现有SSH连接测试命令输出不符合预期")
                        # 连接可能有问题，继续进行新的连接测试
                else:
                    logger.warning("无法获取OpenSSH客户端，连接可能已失效")
                    # 连接已失效，继续进行新的连接测试
            except Exception as e:
                logger.warning(f"验证现有SSH连接时出错: {str(e)}")
                # 连接验证失败，继续进行新的连接测试

        # 如果没有连接或配置不匹配，进行新的连接测试
        result = SSHService.test_connection(ssh_settings)

        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"SSH连接测试失败: {str(e)}"
        }), 500


@ssh_bp.route('/disconnect', methods=['POST'])
def disconnect_ssh():
    """断开全局SSH连接"""
    try:
        SSHManager.disconnect_all()
        return jsonify({
            'success': True,
            'message': 'SSH连接已断开'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'断开SSH连接失败: {str(e)}'
        }), 500


@ssh_bp.route('/upload-interactive-files', methods=['POST'])
def upload_interactive_files():
    """通过OpenSSH上传交互文件（touch_click.py和680kbd）到远程设备"""
    try:
        # 获取SSH客户端
        ssh_client = SSHManager.get_client()
        if not ssh_client:
            return jsonify({
                'success': False,
                'message': '无法获取OpenSSH客户端'
            }), 500

        # 远程目标路径
        remote_dir = '/app/jzj'
        
        # 创建SFTP客户端
        sftp = ssh_client.open_sftp()
        
        uploaded_files = []
        
        try:
            # 确保远程目录存在
            try:
                sftp.stat(remote_dir)
                logger.debug(f"远程目录已存在: {remote_dir}")
            except FileNotFoundError:
                logger.info(f"创建远程目录: {remote_dir}")
                # 使用SSH命令创建目录
                ssh_client.exec_command(f'mkdir -p {remote_dir}')
                # 等待目录创建完成
                import time
                time.sleep(1)  # OpenSSH连接可能需要更长时间
            
            # 上传touch_click.py文件
            touch_click_local_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'utils',
                'touch_click.py'
            )
            
            if os.path.exists(touch_click_local_path):
                touch_click_remote_path = f'{remote_dir}/touch_click.py'
                logger.info(f"开始通过OpenSSH上传touch_click.py脚本: {touch_click_local_path} -> {touch_click_remote_path}")
                
                # 上传文件
                sftp.put(touch_click_local_path, touch_click_remote_path)
                logger.info(f"通过OpenSSH文件上传成功: {touch_click_remote_path}")
                
                # 设置文件权限为可执行
                sftp.chmod(touch_click_remote_path, 0o755)
                logger.info(f"设置文件权限为可执行: {touch_click_remote_path}")
                
                # 验证文件是否上传成功
                try:
                    file_stat = sftp.stat(touch_click_remote_path)
                    file_size = file_stat.st_size
                    logger.info(f"通过OpenSSH文件验证成功，大小: {file_size} 字节")
                    uploaded_files.append({
                        'name': 'touch_click.py',
                        'local_path': touch_click_local_path,
                        'remote_path': touch_click_remote_path,
                        'file_size': file_size
                    })
                except Exception as e:
                    logger.warning(f"通过OpenSSH文件验证失败: {str(e)}")
                    raise Exception(f"通过OpenSSH文件上传后验证失败: {str(e)}")
            else:
                logger.warning(f"本地脚本文件不存在: {touch_click_local_path}")
            
            # 上传680kbd文件
            kbd_local_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'control',
                '680kbd'
            )
            
            if os.path.exists(kbd_local_path):
                kbd_remote_path = f'{remote_dir}/680kbd'
                logger.info(f"开始通过OpenSSH上传680kbd文件: {kbd_local_path} -> {kbd_remote_path}")
                
                # 上传文件
                sftp.put(kbd_local_path, kbd_remote_path)
                logger.info(f"通过OpenSSH文件上传成功: {kbd_remote_path}")
                
                # 设置文件权限为可执行
                sftp.chmod(kbd_remote_path, 0o755)
                logger.info(f"设置文件权限为可执行: {kbd_remote_path}")
                
                # 验证文件是否上传成功
                try:
                    file_stat = sftp.stat(kbd_remote_path)
                    file_size = file_stat.st_size
                    logger.info(f"通过OpenSSH文件验证成功，大小: {file_size} 字节")
                    uploaded_files.append({
                        'name': '680kbd',
                        'local_path': kbd_local_path,
                        'remote_path': kbd_remote_path,
                        'file_size': file_size
                    })
                except Exception as e:
                    logger.warning(f"通过OpenSSH文件验证失败: {str(e)}")
                    raise Exception(f"通过OpenSSH文件上传后验证失败: {str(e)}")
            else:
                logger.warning(f"本地键盘文件不存在: {kbd_local_path}")

        finally:
            sftp.close()

        if not uploaded_files:
            return jsonify({
                'success': False,
                'message': '没有找到任何可上传的交互文件'
            }), 404

        return jsonify({
            'success': True,
            'message': f'通过OpenSSH成功上传 {len(uploaded_files)} 个交互文件',
            'uploaded_files': uploaded_files,
            'connection_type': 'openssh_direct'
        })

    except Exception as e:
        logger.error(f"通过OpenSSH上传交互文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'通过OpenSSH上传交互文件失败: {str(e)}'
        }), 500