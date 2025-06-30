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
        
        # 调用SSH服务的测试连接方法
        from backend.services.ssh_service import SSHService
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