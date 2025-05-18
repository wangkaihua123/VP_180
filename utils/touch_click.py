#!/usr/bin/python3

"""
触摸点击操作模块

该模块提供基础的触摸点击操作功能。主要功能包括：
1. 执行触摸点击
2. 支持坐标点击
3. 提供点击反馈
4. 错误处理

主要类：
- TouchClick: 负责执行触摸点击操作
"""

import struct
import time
import sys
import math

INPUT_DEVICE = "/dev/input/event1"
EVENT_FORMAT = "llHHi"
EVENT_SIZE = struct.calcsize(EVENT_FORMAT)

# 屏幕配置
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 600
MAX_X = 9599
MAX_Y = 9599

def convert_screen_to_touch(x, y):
    """将屏幕坐标转换为触摸屏坐标"""
    touch_x = int((x / SCREEN_WIDTH) * MAX_X)
    touch_y = int((y / SCREEN_HEIGHT) * MAX_Y)
    return touch_x, touch_y

def send_event(fd, event_type, event_code, value):
    """发送单个触摸事件"""
    event = struct.pack(EVENT_FORMAT, 0, 0, event_type, event_code, value)
    fd.write(event)
    fd.flush()

def send_touch_sequence(fd, x, y, is_press):
    """发送完整的触摸事件序列
    
    Args:
        fd: 设备文件描述符
        x: X坐标（屏幕坐标）
        y: Y坐标（屏幕坐标）
        is_press: True表示按下，False表示抬起
    """
    # 转换坐标
    touch_x, touch_y = convert_screen_to_touch(x, y)
    
    if is_press:
        # 按下事件序列
        send_event(fd, 1, 330, 1)              # BTN_TOUCH press
        send_event(fd, 3, 47, 0)               # ABS_MT_SLOT 0
        send_event(fd, 3, 57, 8)               # ABS_MT_TRACKING_ID 8
        send_event(fd, 3, 53, touch_x)         # ABS_MT_POSITION_X
        send_event(fd, 3, 54, touch_y)         # ABS_MT_POSITION_Y
        send_event(fd, 3, 48, 128)             # ABS_MT_TOUCH_MAJOR 128
    else:
        # 抬起事件序列
        send_event(fd, 3, 57, -1)              # ABS_MT_TRACKING_ID -1
        send_event(fd, 1, 330, 0)              # BTN_TOUCH release
    
    # 同步事件
    send_event(fd, 0, 0, 0)                    # SYN_REPORT

def calculate_points(x1, y1, x2, y2, steps=20):
    """计算滑动路径上的点
    :param x1: 起始点X坐标
    :param y1: 起始点Y坐标
    :param x2: 终点X坐标
    :param y2: 终点Y坐标
    :param steps: 滑动步数
    :return: 路径上的点列表
    """
    points = []
    x_step = (x2 - x1) / steps
    y_step = (y2 - y1) / steps
    
    for i in range(steps + 1):
        x = int(x1 + x_step * i)
        y = int(y1 + y_step * i)
        points.append((x, y))
    
    return points

def slide(x1, y1, x2, y2):
    """模拟滑动操作
    :param x1: 起始点X坐标
    :param y1: 起始点Y坐标
    :param x2: 终点X坐标
    :param y2: 终点Y坐标
    """
    try:
        with open(INPUT_DEVICE, "wb") as fd:
            # 1. 按下事件序列
            send_event(fd, 1, 330, 1)              # BTN_TOUCH press
            send_event(fd, 3, 47, 0)               # ABS_MT_SLOT 0
            send_event(fd, 3, 57, 8)               # ABS_MT_TRACKING_ID 8
            send_event(fd, 3, 53, x1)              # ABS_MT_POSITION_X
            send_event(fd, 3, 54, y1)              # ABS_MT_POSITION_Y
            send_event(fd, 3, 48, 128)             # ABS_MT_TOUCH_MAJOR 128
            send_event(fd, 0, 0, 0)                # SYN_REPORT
            
            # 2. 计算滑动路径点
            points = calculate_points(x1, y1, x2, y2)
            
            # 3. 发送滑动事件
            for x, y in points[1:]:  # 跳过第一个点，因为已经在按下事件中发送
                time.sleep(0.01)  # 控制滑动速度
                send_event(fd, 3, 53, x)           # ABS_MT_POSITION_X
                send_event(fd, 3, 54, y)           # ABS_MT_POSITION_Y
                send_event(fd, 0, 0, 0)            # SYN_REPORT
            
            # 4. 抬起事件序列
            send_event(fd, 3, 57, -1)              # ABS_MT_TRACKING_ID -1
            send_event(fd, 1, 330, 0)              # BTN_TOUCH release
            send_event(fd, 0, 0, 0)                # SYN_REPORT

            print(f"✅ 滑动事件已发送: 从({x1}, {y1})到({x2}, {y2})")
            return True
            
    except Exception as e:
        print(f"❌ 滑动事件失败: {str(e)}")
        return False

def click(x, y, long_press=False, touch_duration=None):
    """模拟触控，支持短按、长按和自定义时长
    
    Args:
        x: X坐标（屏幕坐标）
        y: Y坐标（屏幕坐标）
        long_press: 是否长按（1.2秒）
        touch_duration: 自定义触摸时长（秒），优先级高于long_press
    """
    try:
        # 验证坐标范围（使用屏幕坐标范围）
        if not (0 <= x <= SCREEN_WIDTH and 0 <= y <= SCREEN_HEIGHT):
            raise ValueError(f"坐标超出屏幕范围 (0-{SCREEN_WIDTH}, 0-{SCREEN_HEIGHT})")
            
        with open(INPUT_DEVICE, "wb") as fd:
            # 1. 发送按下事件序列
            send_touch_sequence(fd, x, y, True)

            # 2. 延迟时间
            if touch_duration is not None:
                time.sleep(float(touch_duration))  # 使用自定义触摸时长
                press_type = f"触摸{touch_duration}秒"
            elif long_press:
                time.sleep(1.2)  # 长按1.2秒
                press_type = "长按"
            else:
                time.sleep(0.1)  # 短按0.1秒
                press_type = "短按"

            # 3. 发送抬起事件序列
            send_touch_sequence(fd, x, y, False)

            print(f"✅ {press_type}触摸事件已发送: X={x}, Y={y}")
            return True
            
    except Exception as e:
        print(f"❌ 触摸事件失败: {str(e)}")
        return False

if __name__ == "__main__":
    # 检查参数
    if len(sys.argv) == 3:
        # 点击模式
        try:
            x = int(sys.argv[1])
            y = int(sys.argv[2])
            if not (0 <= x <= 9599 and 0 <= y <= 9599):
                raise ValueError("坐标超出范围 (0-9599)")
            click(x, y)
        except ValueError as ve:
            print(f"❌ 参数错误: {str(ve)}")
            sys.exit(1)
    elif len(sys.argv) == 4:
        # 长按或自定义时长模式
        try:
            x = int(sys.argv[1])
            y = int(sys.argv[2])
            if not (0 <= x <= 9599 and 0 <= y <= 9599):
                raise ValueError("坐标超出范围 (0-9599)")
            if sys.argv[3] == "--long-press":
                click(x, y, long_press=True)
            else:
                # 尝试解析为自定义时长
                try:
                    duration = float(sys.argv[3])
                    if duration <= 0:
                        raise ValueError("触摸时长必须大于0秒")
                    click(x, y, touch_duration=duration)
                except ValueError as ve:
                    print(f"❌ 触摸时长参数错误: {str(ve)}")
                    print("触摸时长必须是一个大于0的数字，例如: 1.5")
                    sys.exit(1)
        except ValueError as ve:
            print(f"❌ 参数错误: {str(ve)}")
            sys.exit(1)
    elif len(sys.argv) == 6 and sys.argv[3] == "--slide-to":
        # 滑动模式
        try:
            x1 = int(sys.argv[1])
            y1 = int(sys.argv[2])
            x2 = int(sys.argv[4])
            y2 = int(sys.argv[5])
            if not all(0 <= x <= 9599 and 0 <= y <= 9599 for x, y in [(x1, y1), (x2, y2)]):
                raise ValueError("坐标超出范围 (0-9599)")
            slide(x1, y1, x2, y2)
        except ValueError as ve:
            print(f"❌ 参数错误: {str(ve)}")
            sys.exit(1)
    else:
        print("用法:")
        print("  点击: python3 touch_click.py <x> <y>")
        print("  长按: python3 touch_click.py <x> <y> --long-press")
        print("  自定义时长: python3 touch_click.py <x> <y> <duration>")
        print("  滑动: python3 touch_click.py <x1> <y1> --slide-to <x2> <y2>")
        sys.exit(1)