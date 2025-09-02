"""
SSH连接触摸和键盘事件监控模块

该模块通过SSH连接监控设备的触摸和键盘事件。主要功能包括：
1. 实时捕获设备的触摸操作
2. 实时捕获设备的键盘操作
3. 解析触摸事件的坐标和时间信息
4. 解析键盘事件的按键和时间信息
5. 通过WebSocket实时推送触摸和键盘事件数据
6. 支持触摸和键盘事件的录制和回放

主要类：
- TouchMonitor: 负责建立SSH连接，监控触摸和键盘事件，并通过WebSocket发送事件数据
"""

import sys
import time
from .ssh_manager import SSHManager
import signal
import re
import json
import logging
import os

# 设置日志级别为DEBUG
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 默认屏幕配置
DEFAULT_SCREEN_WIDTH = 1024
DEFAULT_SCREEN_HEIGHT = 600
MAX_X = 9599
MAX_Y = 9599

class TouchMonitorConfig:
    """触摸和键盘监控配置类，用于管理项目特定的屏幕分辨率设置"""
    
    def __init__(self):
        self.screen_width = DEFAULT_SCREEN_WIDTH
        self.screen_height = DEFAULT_SCREEN_HEIGHT
        self.monitor_keyboard = True  # 是否监控键盘事件
    
    def load_project_config(self, project_id):
        """从settings.json加载项目特定的配置"""
        try:
            settings_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'settings.json')
            if os.path.exists(settings_path):
                with open(settings_path, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                
                # 查找匹配的项目配置
                for project in settings.get('projects', []):
                    if str(project.get('id')) == str(project_id):
                        self.screen_width = int(project.get('resolutionWidth', DEFAULT_SCREEN_WIDTH))
                        self.screen_height = int(project.get('resolutionHeight', DEFAULT_SCREEN_HEIGHT))
                        logger.info(f"已加载项目 {project_id} 的屏幕分辨率配置: {self.screen_width}x{self.screen_height}")
                        return
                
                logger.warning(f"未找到项目 {project_id} 的配置，使用默认配置")
            else:
                logger.warning(f"配置文件 {settings_path} 不存在，使用默认配置")
        except Exception as e:
            logger.error(f"加载项目配置时出错: {str(e)}，使用默认配置")
    
    def convert_touch_to_screen(self, touch_x, touch_y):
        """将触摸屏坐标转换为屏幕坐标"""
        screen_x = round(touch_x / MAX_X * self.screen_width, 1)
        screen_y = round(touch_y / MAX_Y * self.screen_height, 1)
        return screen_x, screen_y

# 创建全局配置实例
touch_config = TouchMonitorConfig()

def convert_touch_to_screen(touch_x, touch_y):
    """将触摸屏坐标转换为屏幕坐标"""
    return touch_config.convert_touch_to_screen(touch_x, touch_y)

def find_input_devices(ssh_client):
    """自动检测输入设备类型"""
    devices = {
        'touch': None,
        'keyboard': None
    }
    
    try:
        # 获取所有输入设备信息
        stdin, stdout, stderr = ssh_client.exec_command('cat /proc/bus/input/devices')
        all_devices_info = stdout.read().decode()
        
        # 分割设备信息块
        device_blocks = all_devices_info.split('\n\n')
        
        for block in device_blocks:
            if not block.strip():
                continue
                
            # 提取设备名称和事件处理器
            name_match = re.search(r'N: Name="([^"]+)"', block)
            handlers_match = re.search(r'H: Handlers=([^=]+)(?:\s|$)', block)
            
            if not name_match or not handlers_match:
                continue
                
            device_name = name_match.group(1)
            handlers = handlers_match.group(1)
            
            # 查找event路径
            event_match = re.search(r'(event\d+)', handlers)
            if not event_match:
                continue
                
            event_name = event_match.group(1)
            device_path = f'/dev/input/{event_name}'
            
            # 判断设备类型
            # 检查是否为触摸设备
            touch_indicators = ['touch', 'abs_mt_position', 'touchscreen', 'ilitek_ts']
            if (any(indicator.lower() in block.lower() for indicator in touch_indicators) or
                'ABS=265800000000000' in block):
                devices['touch'] = device_path
                logger.debug(f"检测到触摸设备: {device_path} (名称: {device_name})")
            
            # 检查是否为键盘设备
            keyboard_indicators = ['keyboard', 'btn', 'EV_KEY']
            if (any(indicator.lower() in block.lower() for indicator in keyboard_indicators) and
                'EV=3' in block and 'KEY=' in block):
                # 确保不是触摸设备的键盘部分
                if 'touch' not in device_name.lower() or 'key' in block.lower():
                    devices['keyboard'] = device_path
                    logger.debug(f"检测到键盘设备: {device_path} (名称: {device_name})")
    
    except Exception as e:
        logger.error(f"检测输入设备时出错: {str(e)}")
    
    # 如果没有检测到设备，使用默认值
    if not devices['touch']:
        devices['touch'] = '/dev/input/event1'
        logger.warning("未检测到触摸设备，使用默认值 /dev/input/event1")
    
    if not devices['keyboard']:
        devices['keyboard'] = '/dev/input/event0'
        logger.warning("未检测到键盘设备，使用默认值 /dev/input/event0")
    
    return devices

class TouchMonitor:
    def __init__(self, project_id=None):
        self.ssh_manager = SSHManager.get_instance()
        self.is_monitoring = False
        self.websocket = None
        self.touch_channel = None
        self.keyboard_channel = None
        self.project_id = project_id
        
        # 如果提供了项目ID，加载项目特定的配置
        if project_id:
            touch_config.load_project_config(project_id)
    
    def set_project_id(self, project_id):
        """设置项目ID并加载对应的配置"""
        self.project_id = project_id
        if project_id:
            touch_config.load_project_config(project_id)
            logger.info(f"已设置项目ID为 {project_id} 并加载对应的屏幕分辨率配置")
        
    def start_monitoring(self, ws):
        """开始通过SSH连接监控触摸和键盘事件"""
        if self.is_monitoring:
            logger.debug("已经在通过SSH连接监控中，忽略重复启动请求")
            return
            
        logger.info("开始通过SSH连接监控触摸和键盘事件...")
        self.is_monitoring = True
        self.websocket = ws
        
        try:
            logger.info("正在获取SSH连接...")
            # 获取现有连接
            ssh_client = self.ssh_manager.get_client()
            if not ssh_client:
                logger.error("无法获取SSH连接")
                self._send_event({"type": "error", "message": "无法获取SSH连接"})
                return
            
            # 检查evtest命令是否存在
            logger.debug("通过SSH连接检查evtest命令...")
            stdin, stdout, stderr = ssh_client.exec_command('which evtest')
            evtest_path = stdout.read().decode().strip()
            if not evtest_path:
                logger.error("通过SSH连接未找到evtest命令")
                self._send_event({"type": "error", "message": "通过SSH连接未找到evtest命令，请确保已安装"})
                return
            
            # 自动检测输入设备
            logger.debug("正在自动检测输入设备...")
            devices = find_input_devices(ssh_client)
            
            touch_device = devices['touch']
            keyboard_device = devices['keyboard']
            
            logger.info("通过SSH连接成功，开始执行evtest命令...")
            # 使用SSH Channel执行evtest命令
            transport = ssh_client.get_transport()
            
            # 创建触摸监控通道
            self.touch_channel = transport.open_session()
            self.touch_channel.get_pty()
            self.touch_channel.settimeout(None)  # 设置为阻塞模式
            
            touch_command = f'{evtest_path} {touch_device}'
            logger.debug(f"通过SSH连接执行触摸监控命令: {touch_command}")
            self.touch_channel.exec_command(touch_command)
            
            # 如果启用了键盘监控，创建键盘监控通道
            if touch_config.monitor_keyboard:
                self.keyboard_channel = transport.open_session()
                self.keyboard_channel.get_pty()
                self.keyboard_channel.settimeout(None)  # 设置为阻塞模式
                
                keyboard_command = f'{evtest_path} {keyboard_device}'
                logger.debug(f"通过SSH连接执行键盘监控命令: {keyboard_command}")
                self.keyboard_channel.exec_command(keyboard_command)
            
            # 等待命令启动，SSH连接可能需要更长时间
            time.sleep(2)
            
            # 触摸事件变量
            current_x = None
            current_y = None
            touch_start_time = None
            
            # 键盘事件变量
            key_start_time = None
            current_key = None
            
            event_pattern = re.compile(r'Event: time (\d+)\.(\d+), type (\d+) \([^)]+\), code (\d+) \([^)]+\), value (-?\d+)')
            
            # 发送开始监控消息
            self._send_event({"type": "请点击设备触摸屏或按下键盘进行录制！"})
            
            # 创建接收缓冲区
            touch_recv_buffer = ""
            keyboard_recv_buffer = ""
            
            # 标记是否已经跳过了设备信息
            touch_device_info_skipped = False
            keyboard_device_info_skipped = False
            
            while self.is_monitoring:
                try:
                    # 处理触摸事件
                    if self.touch_channel and self.touch_channel.recv_ready():
                        data = self.touch_channel.recv(1024)
                        if not data:
                            logger.warning("触摸监控Channel连接已关闭")
                            break
                            
                        # 将数据添加到缓冲区
                        touch_recv_buffer += data.decode('utf-8', errors='ignore')
                        
                        # 处理缓冲区中的完整行
                        lines = touch_recv_buffer.split('\n')
                        touch_recv_buffer = lines[-1]  # 保留最后一个不完整的行
                        
                        for line in lines[:-1]:  # 处理所有完整的行
                            # 跳过设备信息，直到看到"Testing ... (interrupt to exit)"
                            if not touch_device_info_skipped:
                                if "Testing ... (interrupt to exit)" in line:
                                    touch_device_info_skipped = True
                                    logger.debug("触摸设备初始化完成，开始监控触摸事件")
                                continue
                                
                            # 只处理事件行
                            match = event_pattern.search(line)
                            if match:
                                event_time = float(f"{match.group(1)}.{match.group(2)}")
                                event_type = int(match.group(3))
                                event_code = int(match.group(4))
                                event_value = int(match.group(5))
                                
                                if event_type == 3:  # EV_ABS
                                    if event_code == 53:  # ABS_MT_POSITION_X
                                        current_x = event_value
                                    elif event_code == 54:  # ABS_MT_POSITION_Y
                                        current_y = event_value
                                
                                elif event_type == 1 and event_code == 330:  # EV_KEY and BTN_TOUCH
                                    if event_value == 1:  # Press
                                        touch_start_time = event_time
                                        logger.debug("触摸开始")
                                    elif event_value == 0:  # Release
                                        if touch_start_time is not None and current_x is not None and current_y is not None:
                                            duration = event_time - touch_start_time
                                            # 转换坐标
                                            screen_x, screen_y = convert_touch_to_screen(current_x, current_y)
                                            logger.debug(f"触摸结束: X: {screen_x:.1f} Y: {screen_y:.1f} 持续: {duration:.3f}秒")
                                            self._send_event({
                                                "type": "触摸坐标",
                                                "x": screen_x,
                                                "y": screen_y,
                                                "duration": round(duration, 3),
                                                "timestamp": event_time
                                            })
                                        current_x = None
                                        current_y = None
                                        touch_start_time = None
                            elif touch_device_info_skipped:
                                # 只在跳过设备信息后记录无法匹配的行
                                logger.debug(f"无法匹配触摸事件模式: {line}")
                    
                    # 处理键盘事件
                    if self.keyboard_channel and self.keyboard_channel.recv_ready():
                        data = self.keyboard_channel.recv(1024)
                        if not data:
                            logger.warning("键盘监控Channel连接已关闭")
                            break
                            
                        # 将数据添加到缓冲区
                        keyboard_recv_buffer += data.decode('utf-8', errors='ignore')
                        
                        # 处理缓冲区中的完整行
                        lines = keyboard_recv_buffer.split('\n')
                        keyboard_recv_buffer = lines[-1]  # 保留最后一个不完整的行
                        
                        for line in lines[:-1]:  # 处理所有完整的行
                            # 跳过设备信息，直到看到"Testing ... (interrupt to exit)"
                            if not keyboard_device_info_skipped:
                                if "Testing ... (interrupt to exit)" in line:
                                    keyboard_device_info_skipped = True
                                    logger.debug("键盘设备初始化完成，开始监控键盘事件")
                                continue
                                
                            # 只处理事件行
                            match = event_pattern.search(line)
                            if match:
                                event_time = float(f"{match.group(1)}.{match.group(2)}")
                                event_type = int(match.group(3))
                                event_code = int(match.group(4))
                                event_value = int(match.group(5))
                                
                                if event_type == 1:  # EV_KEY
                                    if event_value == 1:  # Press
                                        key_start_time = event_time
                                        current_key = event_code
                                        logger.debug(f"按键按下: {event_code}")
                                    elif event_value == 0:  # Release
                                        if key_start_time is not None and current_key is not None:
                                            duration = event_time - key_start_time
                                            logger.debug(f"按键释放: {current_key} 持续: {duration:.3f}秒")
                                            self._send_event({
                                                "type": "按键事件",
                                                "key": current_key,
                                                "duration": round(duration, 3),
                                                "timestamp": event_time
                                            })
                                        current_key = None
                                        key_start_time = None
                            elif keyboard_device_info_skipped:
                                # 只在跳过设备信息后记录无法匹配的行
                                logger.debug(f"无法匹配键盘事件模式: {line}")
                    
                    # 如果没有数据可读，短暂休眠避免CPU占用过高
                    time.sleep(0.01)
                except Exception as e:
                    if str(e):
                        logger.error(f"读取Channel数据时出错: {str(e)}")
                    break
                    
        except Exception as e:
            logger.error(f"监控触摸和键盘事件时出错: {str(e)}")
            self._send_event({"type": "error", "message": str(e)})
        finally:
            logger.info("停止监控触摸和键盘事件")
            self.stop_monitoring()
            
    def stop_monitoring(self):
        """停止通过SSH连接监控触摸和键盘事件"""
        logger.info("正在停止通过SSH连接的触摸和键盘监控...")
        self.is_monitoring = False
        
        # 关闭触摸监控通道
        if self.touch_channel:
            try:
                self.touch_channel.close()
            except:
                pass
            self.touch_channel = None
            
        # 关闭键盘监控通道
        if self.keyboard_channel:
            try:
                self.keyboard_channel.close()
            except:
                pass
            self.keyboard_channel = None
            
        # 不再主动断开SSH连接，让SSHManager管理连接生命周期
        if self.websocket:
            try:
                self._send_event({"type": "stopped"})
            except:
                pass
        self.websocket = None
            
    def _send_event(self, event_data):
        """发送事件数据到WebSocket客户端"""
        if self.websocket:
            try:
                message = json.dumps(event_data)
                logger.debug(f"发送WebSocket消息: {message}")
                self.websocket.send(message)
            except Exception as e:
                logger.error(f"发送事件数据时出错: {str(e)}")
                self.stop_monitoring()
