"""
SSH设置路由处理模块 - 处理SSH连接设置的API
"""
from flask import request, jsonify
from . import ssh_bp
from utils.ssh_manager import SSHManager
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
        ssh_manager = SSHManager()
        
        # 使用提供的设置信息临时覆盖SSHManager的配置
        ssh_manager.hostname = data.get('host', ssh_manager.hostname)
        ssh_manager.port = data.get('port', ssh_manager.port)
        ssh_manager.username = data.get('username', ssh_manager.username)
        ssh_manager.password = data.get('password', ssh_manager.password)
        
        # 尝试连接
        client = ssh_manager.connect()
        
        if client:
            # 连接成功，断开连接
            ssh_manager.disconnect()
            return jsonify({
                'success': True,
                'message': "SSH连接测试成功"
            })
        else:
            return jsonify({
                'success': False,
                'message': "SSH连接测试失败: 无法建立连接"
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"SSH连接测试失败: {str(e)}"
        }), 500 