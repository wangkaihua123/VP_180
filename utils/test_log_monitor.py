"""
测试日志监控工具的脚本

该脚本生成一些测试日志条目，以便测试log_monitor.py的功能。
运行此脚本后，可以同时运行log_monitor.py来观察日志更新。
"""

import os
import time
import logging
import random
from datetime import datetime

# 获取VP_180.log文件路径 - 更新为直接指向data目录
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
log_file = os.path.join(log_dir, 'VP_180.log')

# 不再创建logs目录

# 设置日志格式
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    filename=log_file,
    filemode='a'  # 追加模式
)

# 测试消息
test_messages = [
    "成功加载FUNCTIONS配置",
    "串口管理器初始化完成",
    "开始建立新的串口连接...",
    "串口连接成功",
    "串口连接失败: 权限被拒绝",
    "串口连接失败: 找不到指定的设备",
    "SSH管理器初始化完成",
    "SSH已连接",
    "SSH连接失败: 无法连接到主机",
    "检查远程目录结构",
    "找到最新图像文件",
    "获取图像失败: 无法读取图像文件",
    "点击按钮出错: 找不到按钮坐标",
    "找到按钮的坐标: (1234, 5678)",
    "执行命令: python3 /app/touch_click.py 1234 5678"
]

# 测试日志级别
log_levels = {
    'DEBUG': logging.DEBUG,
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL
}

def generate_log_entries(count=20, interval=0.5):
    """
    生成指定数量的随机日志条目
    
    Args:
        count: 要生成的日志条目数量
        interval: 日志条目之间的时间间隔(秒)
    """
    logger = logging.getLogger("utils.test_log_generator")
    
    print(f"开始生成{count}条测试日志到 {log_file}")
    print("请同时运行 python -m utils.log_monitor 来查看实时日志更新")
    
    for i in range(count):
        # 随机选择日志级别和消息
        level_name = random.choice(list(log_levels.keys()))
        level = log_levels[level_name]
        message = random.choice(test_messages)
        
        # 记录日志
        logger.log(level, message)
        
        print(f"已生成 {i+1}/{count} 条日志: {level_name} - {message}")
        time.sleep(interval)
    
    print(f"测试完成! 共生成了 {count} 条日志条目")

if __name__ == "__main__":
    generate_log_entries() 