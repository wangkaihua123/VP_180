"""
SSH设置路由处理模块 - 处理SSH连接设置的API
"""
from flask import request, jsonify
from . import ssh_bp
from backend.utils.ssh_manager import SSHManager
from backend.models.settings import Settings


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
        from backend.services.ssh_service import SSHService
        from backend.utils.ssh_manager import SSHManager

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