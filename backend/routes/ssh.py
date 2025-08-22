"""
SSH设置路由处理模块 - 处理SSH连接设置的API
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
    """获取SSH设置"""
    try:
        settings = Settings.get_ssh_settings()
        if settings:
            return jsonify({
                'success': True,
                'settings': settings
            })
        return jsonify({
            'success': True,
            'settings': None
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"获取SSH设置失败: {str(e)}"
        }), 500


@ssh_bp.route('/settings', methods=['POST'])
def update_ssh_settings():
    """更新SSH设置"""
    try:
        data = request.json
        success = Settings.update_ssh_settings(data)
        if success:
            return jsonify({
                'success': True,
                'settings': Settings.get_ssh_settings(),
                'message': 'SSH设置已更新'
            })
        else:
            return jsonify({
                'success': False,
                'message': "保存SSH设置失败"
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"更新SSH设置失败: {str(e)}"
        }), 500


@ssh_bp.route('/test', methods=['POST'])
def test_connection():
    """测试SSH连接"""
    try:
        data = request.json

        # 从请求数据中获取SSH设置
        ssh_settings = {
            'host': data.get('host'),
            'port': int(data.get('port', 22)),
            'username': data.get('username'),
            'password': data.get('password')
        }

        # 首先检查是否已经有活跃的SSH连接
        from services.ssh_service import SSHService
        from utils.ssh_manager import SSHManager

        # 检查当前连接状态
        if SSHManager.is_connected():
            # 获取当前连接的配置
            ssh_manager = SSHManager.get_instance()
            current_host = getattr(ssh_manager, 'hostname', None)
            current_port = getattr(ssh_manager, 'port', None)
            current_username = getattr(ssh_manager, 'username', None)

            # 检查当前连接是否与请求的配置匹配
            if (current_host == ssh_settings['host'] and
                current_port == ssh_settings['port'] and
                current_username == ssh_settings['username']):

                # 连接配置匹配，直接返回成功
                return jsonify({
                    'success': True,
                    'message': '连接已存在且配置匹配',
                    'diagnostics': {
                        'authentication': True,
                        'commandExecution': True,
                        'networkConnectivity': True,
                        'sshService': True,
                        'errorType': None,
                        'errorDetails': None,
                        'connectionStatus': 'existing_connection'
                    }
                })

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


@ssh_bp.route('/upload-touch-script', methods=['POST'])
def upload_touch_script():
    """上传touch_click.py脚本到远程设备"""
    try:
        # 检查SSH连接
        if not SSHManager.is_connected():
            return jsonify({
                'success': False,
                'message': 'SSH连接未建立，请先连接设备'
            }), 400

        # 获取SSH客户端
        ssh_client = SSHManager.get_client()
        if not ssh_client:
            return jsonify({
                'success': False,
                'message': '无法获取SSH客户端'
            }), 500

        # 本地touch_click.py文件路径
        local_script_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'utils',
            'touch_click.py'
        )

        if not os.path.exists(local_script_path):
            return jsonify({
                'success': False,
                'message': f'本地脚本文件不存在: {local_script_path}'
            }), 404

        # 远程目标路径
        remote_dir = '/app/jzj'
        remote_script_path = f'{remote_dir}/touch_click.py'

        logger.info(f"开始上传touch_click.py脚本: {local_script_path} -> {remote_script_path}")

        # 创建SFTP客户端
        sftp = ssh_client.open_sftp()

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
                time.sleep(0.5)

            # 上传文件
            sftp.put(local_script_path, remote_script_path)
            logger.info(f"文件上传成功: {remote_script_path}")

            # 设置文件权限为可执行
            sftp.chmod(remote_script_path, 0o755)
            logger.info(f"设置文件权限为可执行: {remote_script_path}")

            # 验证文件是否上传成功
            try:
                file_stat = sftp.stat(remote_script_path)
                file_size = file_stat.st_size
                logger.info(f"文件验证成功，大小: {file_size} 字节")
            except Exception as e:
                logger.warning(f"文件验证失败: {str(e)}")
                raise Exception(f"文件上传后验证失败: {str(e)}")

        finally:
            sftp.close()

        return jsonify({
            'success': True,
            'message': 'touch_click.py脚本上传成功',
            'local_path': local_script_path,
            'remote_path': remote_script_path,
            'file_size': file_size
        })

    except Exception as e:
        logger.error(f"上传touch_click.py脚本失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'上传脚本失败: {str(e)}'
        }), 500