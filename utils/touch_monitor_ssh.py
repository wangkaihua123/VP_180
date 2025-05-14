import sys
import time
from .ssh_manager import SSHManager
import signal
import re
import asyncio
import websockets
import json
import logging
import socket

logger = logging.getLogger(__name__)

def is_port_in_use(port):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return False
        except socket.error:
            return True

class TouchMonitor:
    def __init__(self):
        self.ssh_manager = SSHManager()
        self.is_monitoring = False
        self.websocket = None
        self._server = None
        self._server_task = None
        self.base_port = 8765
        
    def find_available_port(self):
        """查找可用端口"""
        port = self.base_port
        while is_port_in_use(port) and port < self.base_port + 10:
            port += 1
        if port >= self.base_port + 10:
            raise RuntimeError("无法找到可用端口")
        return port
        
    async def start_websocket_server(self):
        port = self.find_available_port()
        logger.info(f"使用端口 {port} 启动WebSocket服务器...")
        
        async def handler(websocket, path):
            self.websocket = websocket
            try:
                async for message in websocket:
                    command = json.loads(message)
                    if command['action'] == 'start':
                        await self.start_monitoring()
                    elif command['action'] == 'stop':
                        await self.stop_monitoring()
            except websockets.exceptions.ConnectionClosed:
                self.websocket = None
                self.is_monitoring = False
            finally:
                if self.is_monitoring:
                    await self.stop_monitoring()

        try:
            self._server = await websockets.serve(handler, 'localhost', port)
            logger.info(f"WebSocket服务器正在监听端口 {port}")
            await self._server.wait_closed()
        except Exception as e:
            logger.error(f"WebSocket服务器运行错误: {str(e)}")
            raise

    def run_server(self):
        """在新线程中运行WebSocket服务器"""
        try:
            asyncio.run(self.start_websocket_server())
        except Exception as e:
            logger.error(f"运行WebSocket服务器失败: {str(e)}")
            raise

    def stop_server(self):
        """停止WebSocket服务器"""
        if self._server:
            self._server.close()
            logger.info("WebSocket服务器已关闭")
                
    async def send_event(self, event_data):
        if self.websocket:
            try:
                await self.websocket.send(json.dumps(event_data))
            except Exception as e:
                logger.error(f"发送事件数据时出错: {str(e)}")
                
    async def start_monitoring(self):
        if self.is_monitoring:
            return
            
        self.is_monitoring = True
        self.ssh_manager.connect()
        
        ssh_client = self.ssh_manager.get_client()
        if not ssh_client:
            await self.send_event({"type": "error", "message": "无法创建SSH连接"})
            return
            
        try:
            stdin, stdout, stderr = ssh_client.exec_command('evtest /dev/input/event1')
            
            current_x = None
            current_y = None
            touch_start_time = None
            
            event_pattern = re.compile(r'Event: time (\d+)\.(\d+), type (\d+) \([^)]+\), code (\d+) \([^)]+\), value (-?\d+)')
            
            while self.is_monitoring:
                line = stdout.readline().strip()
                if not line:
                    continue
                    
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
                    
                    if event_type == 3:
                        if event_code == 53:
                            current_x = event_value * 1240 / 9600
                            await self.send_event({
                                "type": "coordinate",
                                "x": current_x,
                                "timestamp": event_time
                            })
                        elif event_code == 54:
                            current_y = event_value * 600 / 9600
                            await self.send_event({
                                "type": "coordinate",
                                "y": current_y,
                                "timestamp": event_time
                            })
                    
                    elif event_type == 1 and event_code == 330:
                        if event_value == 1:
                            touch_start_time = event_time
                            await self.send_event({
                                "type": "touch_start",
                                "timestamp": event_time
                            })
                        elif event_value == 0:
                            if touch_start_time is not None and current_x is not None and current_y is not None:
                                duration = event_time - touch_start_time
                                await self.send_event({
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
            await self.send_event({"type": "error", "message": str(e)})
        finally:
            self.ssh_manager.disconnect()
            self.is_monitoring = False
            
    async def stop_monitoring(self):
        logger.info("正在停止触摸监控...")
        self.is_monitoring = False
        self.ssh_manager.disconnect()
        if self.websocket:
            await self.send_event({"type": "stopped"})
            
if __name__ == "__main__":
    monitor = TouchMonitor()
    monitor.run_server()