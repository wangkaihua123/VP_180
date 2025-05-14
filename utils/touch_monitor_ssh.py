import sys
import time
import struct
import math
from .ssh_manager import SSHManager
from .log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

# 定义事件类型和代码
EV_SYN = 0x00
EV_KEY = 0x01
EV_ABS = 0x03

# 定义触摸事件代码
BTN_TOUCH = 0x14a
ABS_MT_SLOT = 0x2f
ABS_MT_TRACKING_ID = 0x39
ABS_MT_POSITION_X = 0x35
ABS_MT_POSITION_Y = 0x36
ABS_MT_TOUCH_MAJOR = 0x30

class TouchTracker:
    def __init__(self):
        self.touch_points = {}  # 使用字典存储多点触控数据，key为tracking_id
        self.current_slot = 0
        self.screen_width = 1024  # 屏幕分辨率
        self.screen_height = 600
        self.min_swipe_distance = 50  # 最小滑动距离
        self.long_press_threshold = 1.0  # 长按阈值（秒）
        self.double_click_threshold = 0.3  # 双击时间阈值（秒）
        self.last_click_time = None
        self.last_click_position = None
        self.start_timestamp = None  # 记录第一个事件的时间戳

    def start_touch(self, tracking_id, x=None, y=None, timestamp=None):
        """开始一个新的触摸点"""
        if timestamp is None:
            logger.warning("未提供时间戳")
            return
            
        # 记录第一个事件的时间戳作为基准时间
        if self.start_timestamp is None:
            self.start_timestamp = timestamp
            
        self.touch_points[tracking_id] = {
            'start_time': timestamp,
            'start_x': x,
            'start_y': y,
            'last_x': x,
            'last_y': y,
            'points': [(x, y)] if x is not None and y is not None else [],
            'slot': self.current_slot
        }

    def update_position(self, tracking_id, x=None, y=None):
        """更新触摸点位置"""
        if tracking_id in self.touch_points:
            point = self.touch_points[tracking_id]
            if x is not None:
                point['last_x'] = x
            if y is not None:
                point['last_y'] = y
            if x is not None and y is not None:
                point['points'].append((x, y))

    def end_touch(self, tracking_id, timestamp=None):
        """结束一个触摸点并分析手势"""
        if tracking_id not in self.touch_points or timestamp is None:
            return

        point = self.touch_points[tracking_id]
        if 'start_time' not in point:
            logger.warning(f"触摸点 {tracking_id} 没有开始时间")
            return
            
        # 计算相对时间（从第一个事件开始）
        duration = timestamp - point['start_time']
        
        # 如果持续时间异常，记录警告
        if duration < 0 or duration > 10:  # 假设正常触摸不会超过10秒
            logger.warning(f"检测到异常的触摸持续时间: {duration:.2f}秒")
            if duration < 0:
                logger.error(f"时间戳错误: 开始={point['start_time']}, 结束={timestamp}")
                return
        
        # 转换坐标到屏幕分辨率
        start_pos = self._convert_coords(point['start_x'], point['start_y'])
        end_pos = self._convert_coords(point['last_x'], point['last_y'])
        
        # 分析手势类型
        gesture = self._analyze_gesture(point, duration, start_pos, end_pos)
        
        # 打印触摸信息
        self._print_touch_info(gesture, duration, start_pos, end_pos)
        
        # 检查是否为双击
        if gesture['type'] == "点击":
            if self._is_double_click(timestamp, end_pos):
                gesture['type'] = "双击"
                print("检测到双击！")
            self.last_click_time = timestamp
            self.last_click_position = end_pos
        
        # 清理数据
        del self.touch_points[tracking_id]

    def _convert_coords(self, x, y):
        """将原始坐标转换为屏幕坐标"""
        if x is None or y is None:
            return None, None
        return (
            x * self.screen_width / 9600,
            y * self.screen_height / 9600
        )

    def _analyze_gesture(self, point, duration, start_pos, end_pos):
        """分析手势类型"""
        if not point['points']:
            return {'type': "未知"}
            
        # 计算移动距离和速度
        distance = self._calculate_distance(start_pos, end_pos)
        speed = distance / duration if duration > 0 else 0
        
        # 分析轨迹特征
        path_length = self._calculate_path_length(point['points'])
        straightness = distance / path_length if path_length > 0 else 1
        
        # 判断手势类型
        if distance < self.min_swipe_distance:
            if duration >= self.long_press_threshold:
                return {'type': "长按", 'duration': duration}
            return {'type': "点击", 'duration': duration}
        else:
            direction = self._get_swipe_direction(start_pos, end_pos)
            return {
                'type': "滑动",
                'direction': direction,
                'distance': distance,
                'speed': speed,
                'straightness': straightness
            }

    def _calculate_distance(self, pos1, pos2):
        """计算两点间距离"""
        if None in (pos1, pos2):
            return 0
        return ((pos2[0] - pos1[0]) ** 2 + (pos2[1] - pos1[1]) ** 2) ** 0.5

    def _calculate_path_length(self, points):
        """计算路径总长度"""
        if len(points) < 2:
            return 0
        length = 0
        for i in range(1, len(points)):
            p1 = self._convert_coords(*points[i-1])
            p2 = self._convert_coords(*points[i])
            length += self._calculate_distance(p1, p2)
        return length

    def _get_swipe_direction(self, start_pos, end_pos):
        """获取滑动方向"""
        if None in (start_pos, end_pos):
            return "未知"
            
        dx = end_pos[0] - start_pos[0]
        dy = end_pos[1] - start_pos[1]
        
        # 计算角度
        angle = math.degrees(math.atan2(dy, dx))
        
        # 将角度转换为方向
        if abs(dx) > abs(dy):
            return "右" if dx > 0 else "左"
        else:
            return "下" if dy > 0 else "上"

    def _is_double_click(self, current_time, current_pos):
        """检查是否为双击"""
        if self.last_click_time is None or self.last_click_position is None:
            return False
            
        time_diff = current_time - self.last_click_time
        distance = self._calculate_distance(current_pos, self.last_click_position)
        
        return time_diff <= self.double_click_threshold and distance < self.min_swipe_distance

    def _print_touch_info(self, gesture, duration, start_pos, end_pos):
        """打印触摸信息"""
        print("\n触摸事件结束:")
        print(f"类型: {gesture['type']}")
        print(f"持续时间: {duration:.2f}秒")
        
        if gesture['type'] == "滑动":
            print(f"方向: {gesture['direction']}")
            print(f"距离: {gesture['distance']:.1f}像素")
            print(f"速度: {gesture['speed']:.1f}像素/秒")
            print(f"直线度: {gesture['straightness']:.2f}")
            print(f"起始位置: ({start_pos[0]:.1f}, {start_pos[1]:.1f})")
            print(f"结束位置: ({end_pos[0]:.1f}, {end_pos[1]:.1f})")
        else:
            print(f"位置: ({end_pos[0]:.1f}, {end_pos[1]:.1f})")

def parse_event(data):
    """解析输入事件数据"""
    try:
        # 使用小端序解析
        sec, usec = struct.unpack('<LL', data[0:8])
        type_, code = struct.unpack('<HH', data[8:12])
        value, = struct.unpack('<i', data[12:16])
        # 返回完整的时间戳（秒 + 微秒部分）
        timestamp = float(sec) + float(usec) / 1000000
        return timestamp, type_, code, value
    except Exception as e:
        logger.error(f"解析错误: {e}")
        return None, None, None, None

def monitor_touch():
    try:
        # 获取SSH连接
        ssh_manager = SSHManager.get_instance()
        ssh_client = ssh_manager.get_client()
        
        if not ssh_client:
            logger.error("无法建立SSH连接")
            return
            
        logger.info("SSH连接成功，开始监听触摸事件...")
        
        # 打开SSH会话
        channel = ssh_client.get_transport().open_session()
        channel.exec_command('cat /dev/input/event1')
        
        buffer = b''
        tracker = TouchTracker()
        current_slot = 0
        tracking_ids = {}  # 存储每个slot对应的tracking_id
        pending_position = {}  # 存储待更新的位置信息
        
        # 读取数据
        while True:
            try:
                data = channel.recv(1024)
                if not data:
                    logger.warning("连接断开")
                    break
                
                buffer += data
                
                # 处理完整的事件数据
                while len(buffer) >= 16:  # 每个事件16字节
                    event_data = buffer[:16]
                    buffer = buffer[16:]
                    
                    # 解析事件数据
                    timestamp, type_, code, value = parse_event(event_data)
                    if type_ is None:
                        continue
                    
                    # 处理触摸事件
                    if type_ == EV_ABS:
                        if code == ABS_MT_SLOT:
                            current_slot = value
                            # 清除之前slot的待更新位置
                            if current_slot in pending_position:
                                pending_position[current_slot] = {}
                        elif code == ABS_MT_TRACKING_ID:
                            if value != -1:
                                tracking_ids[current_slot] = value
                                tracker.start_touch(value, timestamp=timestamp)
                                # 初始化待更新位置
                                pending_position[current_slot] = {}
                            else:
                                # 结束触摸
                                if current_slot in tracking_ids:
                                    tracking_id = tracking_ids[current_slot]
                                    # 更新最后的位置（如果有）
                                    if current_slot in pending_position:
                                        pos = pending_position[current_slot]
                                        if 'x' in pos:
                                            tracker.update_position(tracking_id, x=pos['x'])
                                        if 'y' in pos:
                                            tracker.update_position(tracking_id, y=pos['y'])
                                    tracker.end_touch(tracking_id, timestamp=timestamp)
                                    del tracking_ids[current_slot]
                                    if current_slot in pending_position:
                                        del pending_position[current_slot]
                        elif code == ABS_MT_POSITION_X:
                            if current_slot in tracking_ids:
                                tracking_id = tracking_ids[current_slot]
                                if current_slot not in pending_position:
                                    pending_position[current_slot] = {}
                                pending_position[current_slot]['x'] = value
                                tracker.update_position(tracking_id, x=value)
                        elif code == ABS_MT_POSITION_Y:
                            if current_slot in tracking_ids:
                                tracking_id = tracking_ids[current_slot]
                                if current_slot not in pending_position:
                                    pending_position[current_slot] = {}
                                pending_position[current_slot]['y'] = value
                                tracker.update_position(tracking_id, y=value)
                    elif type_ == EV_SYN:
                        # 在同步事件时更新所有待更新的位置
                        for slot, pos in pending_position.items():
                            if slot in tracking_ids and ('x' in pos or 'y' in pos):
                                tracking_id = tracking_ids[slot]
                                tracker.update_position(tracking_id, 
                                                     x=pos.get('x', None),
                                                     y=pos.get('y', None))
                        # 清除所有待更新位置
                        pending_position.clear()
                
            except KeyboardInterrupt:
                logger.info("\n停止监听")
                break
            except Exception as e:
                logger.error(f"读取错误: {e}")
                continue
                
    except Exception as e:
        logger.error(f"连接错误: {e}")
    finally:
        try:
            if 'channel' in locals():
                channel.close()
        except:
            pass

if __name__ == "__main__":
    monitor_touch()