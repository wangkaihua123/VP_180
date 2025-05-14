import sys
import time
from .ssh_manager import SSHManager
import signal
import re

def signal_handler(sig, frame):
    print("\n正在退出程序...")
    if hasattr(signal_handler, 'ssh_manager'):
        signal_handler.ssh_manager.disconnect()
    sys.exit(0)

def monitor_touch():
    # 初始化SSH连接
    ssh_manager = SSHManager()
    signal_handler.ssh_manager = ssh_manager
    ssh_manager.connect()
    
    print("开始监控触摸屏数据，按 Ctrl+C 退出...")
    print("等待触摸事件...")
    
    # 创建SSH会话
    ssh_client = ssh_manager.get_client()
    if not ssh_client:
        print("无法创建SSH连接")
        return
        
    try:
        # 使用evtest监听触摸事件
        stdin, stdout, stderr = ssh_client.exec_command('evtest /dev/input/event1')
        
        # 当前的触摸状态
        current_x = None
        current_y = None
        touch_start_time = None
        
        # 编译正则表达式
        event_pattern = re.compile(r'Event: time (\d+)\.(\d+), type (\d+) \([^)]+\), code (\d+) \([^)]+\), value (-?\d+)')
        
        while True:
            line = stdout.readline().strip()
            if not line:
                continue
                
            # 跳过初始化信息和同步事件
            if "Testing ... (interrupt to exit)" in line or "SYN_REPORT" in line:
                continue
                
            # 匹配事件数据
            match = event_pattern.search(line)
            if match:
                # 解析时间戳
                seconds = int(match.group(1))
                microseconds = int(match.group(2))
                event_time = float(f"{seconds}.{microseconds}")
                
                event_type = int(match.group(3))
                event_code = int(match.group(4))
                event_value = int(match.group(5))
                
                # 事件类型 3 (EV_ABS) 处理绝对坐标
                if event_type == 3:
                    # code 53 是 X 坐标 (ABS_MT_POSITION_X)
                    if event_code == 53:
                        current_x = event_value * 1240 / 9600
                    # code 54 是 Y 坐标 (ABS_MT_POSITION_Y)
                    elif event_code == 54:
                        current_y = event_value * 600 / 9600
                
                # 事件类型 1 (EV_KEY) 处理触摸事件
                elif event_type == 1 and event_code == 330:  # BTN_TOUCH
                    if event_value == 1:  # 按下
                        touch_start_time = event_time
                    elif event_value == 0:  # 释放
                        if touch_start_time is not None and current_x is not None and current_y is not None:
                            duration = event_time - touch_start_time
                            print(f"触摸坐标: X={current_x:.1f}, Y={current_y:.1f}")
                            print(f"持续时间: {duration:.3f} 秒")
                        # 重置状态
                        current_x = None
                        current_y = None
                        touch_start_time = None
    
    except KeyboardInterrupt:
        print("\n正在退出程序...")
    except Exception as e:
        print(f"\n错误: {str(e)}")
    finally:
        ssh_manager.disconnect()

if __name__ == "__main__":
    # 设置信号处理
    signal.signal(signal.SIGINT, signal_handler)
    monitor_touch()