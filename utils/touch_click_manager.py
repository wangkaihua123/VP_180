import struct
import time
import logging
from .ssh_manager import SSHManager
from .log_config import setup_logger

logger = setup_logger(__name__)

# 屏幕配置
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 600
MAX_X = 9599
MAX_Y = 9599

class TouchClickManager:
    def __init__(self):
        """初始化触摸点击管理器"""
        self.ssh_manager = SSHManager.get_instance()
        self.input_device = "/dev/input/event1"
        self.event_format = "llHHi"
        self.event_size = struct.calcsize(self.event_format)
        
    def _convert_screen_to_touch(self, x, y):
        """将屏幕坐标转换为触摸屏坐标"""
        touch_x = int((x / SCREEN_WIDTH) * MAX_X)
        touch_y = int((y / SCREEN_HEIGHT) * MAX_Y)
        return touch_x, touch_y
        
    def _send_event(self, ssh_client, event_type, event_code, value):
        """发送单个触摸事件"""
        event = struct.pack(self.event_format, 0, 0, event_type, event_code, value)
        cmd = f"echo -n '{event.hex()}' | xxd -r -p > {self.input_device}"
        stdin, stdout, stderr = ssh_client.exec_command(cmd)
        error = stderr.read().decode().strip()
        if error:
            logger.error(f"发送事件失败: {error}")
            return False
        return True
        
    def _send_touch_sequence(self, ssh_client, x, y, is_press):
        """发送完整的触摸事件序列"""
        touch_x, touch_y = self._convert_screen_to_touch(x, y)
        
        if is_press:
            # 按下事件序列
            self._send_event(ssh_client, 1, 330, 1)              # BTN_TOUCH press
            self._send_event(ssh_client, 3, 47, 0)               # ABS_MT_SLOT 0
            self._send_event(ssh_client, 3, 57, 8)               # ABS_MT_TRACKING_ID 8
            self._send_event(ssh_client, 3, 53, touch_x)         # ABS_MT_POSITION_X
            self._send_event(ssh_client, 3, 54, touch_y)         # ABS_MT_POSITION_Y
            self._send_event(ssh_client, 3, 48, 128)             # ABS_MT_TOUCH_MAJOR 128
        else:
            # 抬起事件序列
            self._send_event(ssh_client, 3, 57, -1)              # ABS_MT_TRACKING_ID -1
            self._send_event(ssh_client, 1, 330, 0)              # BTN_TOUCH release
        
        # 同步事件
        self._send_event(ssh_client, 0, 0, 0)                    # SYN_REPORT
        
    def _calculate_points(self, x1, y1, x2, y2, steps=20):
        """计算滑动路径上的点"""
        points = []
        x_step = (x2 - x1) / steps
        y_step = (y2 - y1) / steps
        
        for i in range(steps + 1):
            x = int(x1 + x_step * i)
            y = int(y1 + y_step * i)
            points.append((x, y))
        
        return points
        
    def click(self, x, y, long_press=False, touch_duration=None):
        """模拟触控，支持短按、长按和自定义时长"""
        try:
            # 验证坐标范围
            if not (0 <= x <= SCREEN_WIDTH and 0 <= y <= SCREEN_HEIGHT):
                raise ValueError(f"坐标超出屏幕范围 (0-{SCREEN_WIDTH}, 0-{SCREEN_HEIGHT})")
            
            # 获取SSH客户端
            ssh_client = self.ssh_manager.get_client()
            if not ssh_client:
                raise Exception("无法获取SSH连接")
            
            # 发送按下事件序列
            self._send_touch_sequence(ssh_client, x, y, True)
            
            # 延迟时间
            if touch_duration is not None:
                time.sleep(float(touch_duration))
                press_type = f"触摸{touch_duration}秒"
            elif long_press:
                time.sleep(1.2)
                press_type = "长按"
            else:
                time.sleep(0.1)
                press_type = "短按"
            
            # 发送抬起事件序列
            self._send_touch_sequence(ssh_client, x, y, False)
            
            logger.info(f"✅ {press_type}触摸事件已发送: X={x}, Y={y}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 触摸事件失败: {str(e)}")
            return False
            
    def slide(self, x1, y1, x2, y2):
        """模拟滑动操作"""
        try:
            # 获取SSH客户端
            ssh_client = self.ssh_manager.get_client()
            if not ssh_client:
                raise Exception("无法获取SSH连接")
            
            # 1. 按下事件序列
            self._send_event(ssh_client, 1, 330, 1)              # BTN_TOUCH press
            self._send_event(ssh_client, 3, 47, 0)               # ABS_MT_SLOT 0
            self._send_event(ssh_client, 3, 57, 8)               # ABS_MT_TRACKING_ID 8
            self._send_event(ssh_client, 3, 53, x1)              # ABS_MT_POSITION_X
            self._send_event(ssh_client, 3, 54, y1)              # ABS_MT_POSITION_Y
            self._send_event(ssh_client, 3, 48, 128)             # ABS_MT_TOUCH_MAJOR 128
            self._send_event(ssh_client, 0, 0, 0)                # SYN_REPORT
            
            # 2. 计算滑动路径点
            points = self._calculate_points(x1, y1, x2, y2)
            
            # 3. 发送滑动事件
            for x, y in points[1:]:  # 跳过第一个点，因为已经在按下事件中发送
                time.sleep(0.01)  # 控制滑动速度
                self._send_event(ssh_client, 3, 53, x)           # ABS_MT_POSITION_X
                self._send_event(ssh_client, 3, 54, y)           # ABS_MT_POSITION_Y
                self._send_event(ssh_client, 0, 0, 0)            # SYN_REPORT
            
            # 4. 抬起事件序列
            self._send_event(ssh_client, 3, 57, -1)              # ABS_MT_TRACKING_ID -1
            self._send_event(ssh_client, 1, 330, 0)              # BTN_TOUCH release
            self._send_event(ssh_client, 0, 0, 0)                # SYN_REPORT
            
            logger.info(f"✅ 滑动事件已发送: 从({x1}, {y1})到({x2}, {y2})")
            return True
            
        except Exception as e:
            logger.error(f"❌ 滑动事件失败: {str(e)}")
            return False 