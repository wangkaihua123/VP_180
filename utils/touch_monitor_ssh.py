"""
触摸事件监控模块

该模块通过SSH连接监控设备的触摸事件。主要功能包括：
1. 实时捕获设备的触摸操作
2. 解析触摸事件的坐标和时间信息
3. 通过WebSocket实时推送触摸事件数据
4. 支持触摸事件的录制和回放

主要类：
- TouchMonitor: 负责建立SSH连接，监控触摸事件，并通过WebSocket发送事件数据
"""

import sys
import time
from .ssh_manager import SSHManager
import signal
import re
import json
import logging

# 设置日志级别为DEBUG
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 屏幕配置
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 600
MAX_X = 9599
MAX_Y = 9599

def convert_touch_to_screen(touch_x, touch_y):
    """将触摸屏坐标转换为屏幕坐标"""
    screen_x = round(touch_x / MAX_X * SCREEN_WIDTH, 1)
    screen_y = round(touch_y / MAX_Y * SCREEN_HEIGHT, 1)
    return screen_x, screen_y

class TouchMonitor:
    def __init__(self):
        self.ssh_manager = SSHManager.get_instance()
        self.is_monitoring = False
        self.websocket = None
        self.channel = None
        
    def start_monitoring(self, ws):
        """开始监控触摸事件"""
        if self.is_monitoring:
            logger.debug("已经在监控中，忽略重复启动请求")
            return
            
        logger.info("开始监控触摸事件...")
        self.is_monitoring = True
        self.websocket = ws
        
        try:
            logger.info("正在建立SSH连接...")
            # 获取现有连接或创建新连接
            ssh_client = self.ssh_manager.get_client()
            if not ssh_client:
                logger.error("无法创建SSH连接")
                self._send_event({"type": "error", "message": "无法创建SSH连接"})
                return
            
            # 检查evtest命令是否存在
            logger.debug("检查evtest命令...")
            stdin, stdout, stderr = ssh_client.exec_command('which evtest')
            evtest_path = stdout.read().decode().strip()
            if not evtest_path:
                logger.error("未找到evtest命令")
                self._send_event({"type": "error", "message": "未找到evtest命令，请确保已安装"})
                return
                
            # 检查触摸设备是否存在
            logger.debug("检查触摸设备...")
            stdin, stdout, stderr = ssh_client.exec_command('ls -l /dev/input/event1')
            device_info = stdout.read().decode().strip()
            if not device_info:
                logger.error("未找到触摸设备/dev/input/event1")
                self._send_event({"type": "error", "message": "未找到触摸设备，请检查设备连接"})
                return
                
            logger.info("SSH连接成功，开始执行evtest命令...")
            # 使用SSH Channel执行evtest命令
            transport = ssh_client.get_transport()
            self.channel = transport.open_session()
            self.channel.get_pty()
            self.channel.settimeout(None)  # 设置为阻塞模式
            
            command = f'{evtest_path} /dev/input/event1'
            logger.debug(f"执行命令: {command}")
            self.channel.exec_command(command)
            
            # 等待命令启动
            time.sleep(1)
            
            current_x = None
            current_y = None
            touch_start_time = None
            
            event_pattern = re.compile(r'Event: time (\d+)\.(\d+), type (\d+) \([^)]+\), code (\d+) \([^)]+\), value (-?\d+)')
            
            # 发送开始监控消息
            self._send_event({"type": "请点击设备触摸屏进行录制！"})
            
            # 创建接收缓冲区
            recv_buffer = ""
            
            # 标记是否已经跳过了设备信息
            device_info_skipped = False
            
            while self.is_monitoring:
                try:
                    # 读取数据
                    if self.channel.recv_ready():
                        data = self.channel.recv(1024)
                        if not data:
                            logger.warning("Channel连接已关闭")
                            break
                            
                        # 将数据添加到缓冲区
                        recv_buffer += data.decode('utf-8', errors='ignore')
                        
                        # 处理缓冲区中的完整行
                        lines = recv_buffer.split('\n')
                        recv_buffer = lines[-1]  # 保留最后一个不完整的行
                        
                        for line in lines[:-1]:  # 处理所有完整的行
                            # 跳过设备信息，直到看到"Testing ... (interrupt to exit)"
                            if not device_info_skipped:
                                if "Testing ... (interrupt to exit)" in line:
                                    device_info_skipped = True
                                    logger.debug("设备信息已跳过，开始监控触摸事件")
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
                            elif device_info_skipped:
                                # 只在跳过设备信息后记录无法匹配的行
                                logger.debug(f"无法匹配事件模式: {line}")
                    else:
                        # 如果没有数据可读，短暂休眠避免CPU占用过高
                        time.sleep(0.1)
                except Exception as e:
                    if str(e):
                        logger.error(f"读取Channel数据时出错: {str(e)}")
                    break
                    
        except Exception as e:
            logger.error(f"监控触摸事件时出错: {str(e)}")
            self._send_event({"type": "error", "message": str(e)})
        finally:
            logger.info("停止监控触摸事件")
            self.stop_monitoring()
            
    def stop_monitoring(self):
        """停止监控触摸事件"""
        logger.info("正在停止触摸监控...")
        self.is_monitoring = False
        if self.channel:
            try:
                self.channel.close()
            except:
                pass
            self.channel = None
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