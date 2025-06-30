"""
日志配置模块

该模块负责配置系统日志。主要功能包括：
1. 设置日志格式
2. 配置日志输出目标
3. 管理日志级别
4. 提供日志记录器

主要函数：
- setup_logger: 配置并返回指定名称的日志记录器
"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
import datetime

# 日志格式
LOG_FORMAT = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"

def setup_logger(name, level=logging.INFO):
    """
    配置并返回指定名称的日志记录器
    
    Args:
        name: 日志记录器名称
        level: 日志级别
        
    Returns:
        logging.Logger: 配置好的日志记录器
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 避免重复添加处理器
    if logger.handlers:
        return logger
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(console_handler)
    
    # 创建文件处理器
    try:
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        today = datetime.datetime.now().strftime("%Y%m%d")
        log_file = os.path.join(log_dir, f"VP_180.log")
        
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'  # 明确指定使用UTF-8编码
        )
        file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"无法创建日志文件: {e}")
    
    return logger