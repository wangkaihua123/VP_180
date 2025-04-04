#!/usr/bin/python3

import struct
import time
import sys
import math

INPUT_DEVICE = "/dev/input/event1"
EVENT_FORMAT = "llHHi"
EVENT_SIZE = struct.calcsize(EVENT_FORMAT)

def send_event(fd, event_type, event_code, value):
    """发送单个触摸事件"""
    event = struct.pack(EVENT_FORMAT, 0, 0, event_type, event_code, value)
    fd.write(event)
    fd.flush()

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

def click(x, y, long_press=False):
    """模拟触控，支持短按和长按(1.2秒)"""
    try:
        with open(INPUT_DEVICE, "wb") as fd:
            # 1. 按下事件序列（完全匹配实际事件）
            send_event(fd, 1, 330, 1)              # BTN_TOUCH press
            send_event(fd, 3, 47, 0)               # ABS_MT_SLOT 0
            send_event(fd, 3, 57, 8)               # ABS_MT_TRACKING_ID 8
            send_event(fd, 3, 53, x)               # ABS_MT_POSITION_X
            send_event(fd, 3, 54, y)               # ABS_MT_POSITION_Y
            send_event(fd, 3, 48, 128)             # ABS_MT_TOUCH_MAJOR 128
            send_event(fd, 0, 0, 0)                # SYN_REPORT

            # 2. 延迟时间(短按0.1秒，长按1.2秒)
            if long_press:
                time.sleep(1.2)  # 长按1.2秒
                press_type = "长按"
            else:
                time.sleep(0.1)  # 短按0.1秒
                press_type = "短按"

            # 3. 抬起事件序列（完全匹配实际事件）
            send_event(fd, 3, 57, -1)              # ABS_MT_TRACKING_ID -1
            send_event(fd, 1, 330, 0)              # BTN_TOUCH release
            send_event(fd, 0, 0, 0)                # SYN_REPORT

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
    elif len(sys.argv) == 4 and sys.argv[3] == "--long-press":
        # 长按模式
        try:
            x = int(sys.argv[1])
            y = int(sys.argv[2])
            if not (0 <= x <= 9599 and 0 <= y <= 9599):
                raise ValueError("坐标超出范围 (0-9599)")
            click(x, y, long_press=True)
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
        print("  滑动: python3 touch_click.py <x1> <y1> --slide-to <x2> <y2>")
        sys.exit(1)