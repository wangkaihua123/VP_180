from flask import Blueprint, request, jsonify
import serial
import serial.tools.list_ports
from .utils import load_settings, save_settings

# 创建蓝图
serial_bp = Blueprint('serial', __name__)

# 校验位映射函数
def map_parity(parity_str):
    """将前端发送的校验位字符串映射为pyserial库需要的枚举值"""
    parity_map = {
        'none': serial.PARITY_NONE,
        'even': serial.PARITY_EVEN,
        'odd': serial.PARITY_ODD
    }
    return parity_map.get(parity_str, serial.PARITY_NONE)

# 串口连接测试
@serial_bp.route('/api/serial/test', methods=['POST'])
def test_serial_connection():
    data = request.get_json()
    port = data.get('port')
    baud_rate = int(data.get('baudRate', 9600))
    data_bits = int(data.get('dataBits', 8))
    stop_bits = int(data.get('stopBits', 1))
    parity_str = data.get('parity', 'none')
    
    # 使用映射函数转换校验位
    parity = map_parity(parity_str)

    print(f"尝试连接串口: {port} with baud rate {baud_rate}")

    try:
        # 创建串口对象
        ser = serial.Serial(
            port=port,
            baudrate=baud_rate,
            bytesize=data_bits,
            stopbits=stop_bits,
            parity=parity,
            timeout=1
        )

        # 测试连接
        if ser.is_open:
            print("串口已成功打开")
            
            # 尝试发送一个简单的测试命令
            try:
                ser.write(b'\r\n')
                print("已发送测试命令")
            except Exception as e:
                print(f"发送测试命令失败: {e}")
            
            # 关闭连接
            ser.close()
            print("串口已关闭")

            # 保存设置
            try:
                settings = load_settings()
                if 'serial' not in settings:
                    settings['serial'] = {}
                
                settings['serial'].update({
                    'port': port,
                    'baudRate': baud_rate,
                    'dataBits': data_bits,
                    'stopBits': stop_bits,
                    'parity': parity_str
                })
                
                save_settings(settings)
                print("串口设置已保存")
            except Exception as e:
                print(f"保存设置失败: {e}")
                # 不影响测试结果，继续返回成功

            return jsonify({
                'success': True,
                'message': '串口连接测试成功'
            })
        else:
            raise serial.SerialException("无法打开串口")

    except serial.SerialException as e:
        print(f"串口异常: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'串口连接错误: {str(e)}'
        }), 500
    except ValueError as e:
        print(f"参数错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'参数错误: {str(e)}'
        }), 400
    except Exception as e:
        print(f"未知错误: {str(e)}")
        print(f"错误类型: {type(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'连接失败: {str(e)}'
        }), 500

# 串口设置路由
@serial_bp.route('/api/serial/settings', methods=['GET'])
def get_serial_settings():
    try:
        settings = load_settings()
        # 获取串口设置，如果不存在则使用默认值
        serial_settings = settings.get('serial', {
            'port': '',
            'baudRate': 9600,
            'dataBits': 8,
            'stopBits': 1,
            'parity': 'none'
        })
        
        return jsonify({
            'success': True,
            'message': '获取设置成功',
            'data': serial_settings
        })
    except Exception as e:
        print(f"获取设置失败: {e}")
        return jsonify({
            'success': False,
            'message': f'获取设置失败: {str(e)}'
        }), 500

@serial_bp.route('/api/serial/settings', methods=['PUT'])
def update_serial_settings():
    try:
        data = request.get_json()
        settings = load_settings()

        # 更新串口设置
        if 'serial' not in settings:
            settings['serial'] = {}
            
        for key in ['port', 'baudRate', 'dataBits', 'stopBits', 'parity']:
            if key in data:
                settings['serial'][key] = data[key]

        if save_settings(settings):
            return jsonify({
                'success': True,
                'message': '设置已更新',
                'data': settings['serial']
            })
        else:
            return jsonify({
                'success': False,
                'message': '保存设置失败'
            }), 500
    except Exception as e:
        print(f"更新设置失败: {e}")
        return jsonify({
            'success': False,
            'message': f'更新设置失败: {str(e)}'
        }), 500

# 获取可用串口列表
@serial_bp.route('/api/serial/ports', methods=['GET'])
def list_serial_ports():
    try:
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                'path': port.device,
                'manufacturer': port.manufacturer,
                'serialNumber': port.serial_number,
                'vendorId': port.vid,
                'productId': port.pid
            })
        
        return jsonify({
            'success': True,
            'message': '获取串口列表成功',
            'data': ports
        })
    except Exception as e:
        print(f"获取串口列表失败: {e}")
        return jsonify({
            'success': False,
            'message': f'获取串口列表失败: {str(e)}'
        }), 500 