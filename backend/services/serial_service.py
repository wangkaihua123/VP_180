"""
串口服务 - 处理串口连接测试和相关操作
"""
import logging
import serial
import serial.tools.list_ports
from models.settings import Settings

logger = logging.getLogger(__name__)

class SerialService:
    """串口服务类，处理串口连接测试和操作"""
    
    @staticmethod
    def get_ports():
        """获取可用串口列表"""
        try:
            ports = []
            for port in serial.tools.list_ports.comports():
                ports.append({
                    'device': port.device,
                    'description': port.description,
                    'hwid': port.hwid
                })
            
            return {
                'success': True,
                'ports': ports
            }
        except Exception as e:
            logger.error(f"获取串口列表出错: {e}")
            return {
                'success': False,
                'message': f"获取串口列表出错: {str(e)}",
                'ports': []
            }
    
    @staticmethod
    def test_connection(serial_settings):
        """测试串口连接"""
        port = serial_settings.get('serialPort')
        baud_rate = int(serial_settings.get('serialBaudRate', 9600))
        
        logger.info(f"尝试连接串口: {port} with baud rate {baud_rate}")
        
        ser = None
        try:
            ser = serial.Serial(port, baud_rate, timeout=1)
            if ser.is_open:
                return {
                    'success': True,
                    'message': f'成功连接到串口 {port}，波特率 {baud_rate}'
                }
            else:
                return {
                    'success': False,
                    'message': f'无法打开串口 {port}'
                }
        except serial.SerialException as e:
            logger.error(f"串口异常: {str(e)}")
            return {
                'success': False,
                'message': f'串口连接错误: {str(e)}'
            }
        except ValueError as e:
            logger.error(f"参数错误: {str(e)}")
            return {
                'success': False,
                'message': f'参数错误: {str(e)}'
            }
        except Exception as e:
            logger.error(f"未知错误: {str(e)}")
            return {
                'success': False,
                'message': f'连接失败: {str(e)}'
            }
        finally:
            if ser and ser.is_open:
                ser.close()
    
    @staticmethod
    def get_settings():
        """获取串口设置"""
        return Settings.get_serial_settings()
    
    @staticmethod
    def update_settings(serial_data):
        """更新串口设置"""
        return Settings.update_serial_settings(serial_data) 