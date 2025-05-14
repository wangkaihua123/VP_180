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

class TouchMonitor:
    def __init__(self):
        self.ssh_manager = SSHManager()
        self.is_monitoring = False
        self.websocket = None
        
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
            # 强制重新连接以确保连接是新的
            self.ssh_manager.force_reconnect()
            
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
            # 使用完整路径执行evtest命令
            command = f'{evtest_path} /dev/input/event1'
            logger.debug(f"执行命令: {command}")
            stdin, stdout, stderr = ssh_client.exec_command(command, get_pty=True)
            
            # 等待命令启动
            time.sleep(1)
            
            # 检查stderr是否有错误输出
            error = stderr.read().decode().strip()
            if error and "Permission denied" in error:
                logger.error(f"执行evtest命令权限不足: {error}")
                self._send_event({"type": "error", "message": "执行evtest命令权限不足，请确保有正确权限"})
                return
            elif error:
                logger.error(f"执行evtest命令出错: {error}")
                self._send_event({"type": "error", "message": f"执行evtest命令出错: {error}"})
                return
            
            current_x = None
            current_y = None
            touch_start_time = None
            
            event_pattern = re.compile(r'Event: time (\d+)\.(\d+), type (\d+) \([^)]+\), code (\d+) \([^)]+\), value (-?\d+)')
            
            # 发送开始监控消息
            self._send_event({"type": "monitoring_started"})
            
            while self.is_monitoring:
                line = stdout.readline()
                if not line:
                    logger.debug("evtest命令输出结束")
                    break
                    
                line = line.strip()
                logger.debug(f"收到原始数据: {line}")
                    
                if "Testing ... (interrupt to exit)" in line or "SYN_REPORT" in line:
                    continue
                    
                match = event_pattern.search(line)
                if match:
                    seconds = int(match.group(1))
                    microseconds = int(match.group(2))
                    event_time = float(f"{seconds}.{microseconds}")
                    
                    event_type = int(match.group(3))
                    event_code = int(match.group(4))
                    event_value = int(match.group(5))
                    
                    logger.debug(f"解析事件: type={event_type}, code={event_code}, value={event_value}")
                    
                    if event_type == 3:  # EV_ABS
                        if event_code == 53:  # ABS_MT_POSITION_X
                            current_x = event_value * 1240 / 9600
                            logger.debug(f"触摸X坐标: {current_x} (原始值: {event_value})")
                            self._send_event({
                                "type": "coordinate",
                                "x": current_x,
                                "timestamp": event_time
                            })
                        elif event_code == 54:  # ABS_MT_POSITION_Y
                            current_y = event_value * 600 / 9600
                            logger.debug(f"触摸Y坐标: {current_y} (原始值: {event_value})")
                            self._send_event({
                                "type": "coordinate",
                                "y": current_y,
                                "timestamp": event_time
                            })
                    
                    elif event_type == 1 and event_code == 330:  # EV_KEY and BTN_TOUCH
                        if event_value == 1:  # Press
                            touch_start_time = event_time
                            logger.debug("触摸开始")
                            self._send_event({
                                "type": "touch_start",
                                "timestamp": event_time
                            })
                        elif event_value == 0:  # Release
                            if touch_start_time is not None and current_x is not None and current_y is not None:
                                duration = event_time - touch_start_time
                                logger.debug(f"触摸结束: 坐标({current_x}, {current_y}), 持续时间={duration}秒")
                                self._send_event({
                                    "type": "touch_end",
                                    "x": current_x,
                                    "y": current_y,
                                    "duration": duration,
                                    "timestamp": event_time
                                })
                            current_x = None
                            current_y = None
                            touch_start_time = None
                            
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
        self.ssh_manager.disconnect()
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