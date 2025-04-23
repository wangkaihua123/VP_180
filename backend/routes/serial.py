"""
串口设置路由处理模块 - 处理串口连接设置的API
"""
from flask import Blueprint, request, jsonify
import serial
from utils.serial_manager import SerialManager
from backend.models.settings import Settings

# 使用已经在__init__.py中创建的蓝图实例
from backend.routes import serial_bp

# 校验位映射函数
def map_parity(parity_str):
    """将前端发送的校验位字符串映射为pyserial库需要的枚举值"""
    parity_map = {
        'none': serial.PARITY_NONE,
        'even': serial.PARITY_EVEN,
        'odd': serial.PARITY_ODD
    }
    return parity_map.get(parity_str, serial.PARITY_NONE)

@serial_bp.route('/settings', methods=['GET'])
def get_serial_settings():
    """获取串口设置"""
    try:
        settings = Settings.get_serial_settings()
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
            'message': f"获取串口设置失败: {str(e)}"
        }), 500

@serial_bp.route('/settings', methods=['POST'])
def update_serial_settings():
    """更新串口设置"""
    try:
        data = request.json
        success = Settings.update_serial_settings(data)
        if success:
            return jsonify({
                'success': True,
                'settings': Settings.get_serial_settings(),
                'message': '串口设置已更新'
            })
        else:
            return jsonify({
                'success': False,
                'message': "保存串口设置失败"
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"更新串口设置失败: {str(e)}"
        }), 500

@serial_bp.route('/ports', methods=['GET'])
def get_serial_ports():
    """获取所有可用串口列表"""
    try:
        # 使用SerialManager的方法获取可用端口列表
        ports = []
        import serial.tools.list_ports
        for port in serial.tools.list_ports.comports():
            ports.append({
                'device': port.device,
                'description': port.description,
                'hwid': port.hwid
            })
            
        return jsonify({
            'success': True,
            'ports': ports
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"获取串口列表失败: {str(e)}"
        }), 500

@serial_bp.route('/test', methods=['POST'])
def test_connection():
    """测试串口连接"""
    try:
        data = request.json
        serial_manager = SerialManager(
            port=data.get('port', 'COM1'),
            baudrate=int(data.get('baudRate', 9600)),
            timeout=1
        )
        
        # 尝试连接
        connection = serial_manager.connect()
        
        if connection:
            # 连接成功，断开连接
            serial_manager.disconnect()
            return jsonify({
                'success': True,
                'message': "串口连接测试成功"
            })
        else:
            return jsonify({
                'success': False,
                'message': "串口连接测试失败: 无法打开串口"
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"串口连接测试失败: {str(e)}"
        }), 500 