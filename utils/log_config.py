"""
日志配置模块

该模块提供统一的日志配置和管理功能。主要功能包括：
1. 配置日志格式和级别
2. 设置日志输出目标
3. 提供日志记录器创建接口
4. 支持不同模块的独立日志配置

主要函数：
- setup_logger: 创建和配置日志记录器
"""

import logging
import os
import json
from logging.handlers import RotatingFileHandler
import time
from functools import wraps

# 添加TRACE日志级别 - 比DEBUG更详细
TRACE = 5  # 自定义级别，数值低于DEBUG(10)
logging.addLevelName(TRACE, "TRACE")

def trace(self, message, *args, **kwargs):
    """添加TRACE级别日志方法"""
    if self.isEnabledFor(TRACE):
        self._log(TRACE, message, args, **kwargs)

# 为Logger类添加trace方法
logging.Logger.trace = trace

# 定义性能日志记录器
performance_logger = None

def setup_performance_logger():
    """设置性能日志记录器"""
    global performance_logger
    if performance_logger is not None:
        return performance_logger
        
    performance_logger = logging.getLogger('performance')
    performance_logger.setLevel(logging.INFO)
    
    # 创建性能日志文件
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    performance_log = os.path.join(log_dir, 'performance.log')
    handler = RotatingFileHandler(
        performance_log,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    
    # 设置格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    performance_logger.addHandler(handler)
    
    return performance_logger

def log_performance(func):
    """性能日志装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start_time
        
        # 记录性能数据
        logger = setup_performance_logger()
        logger.info(json.dumps({
            'function': func.__name__,
            'duration': duration,
            'timestamp': time.time()
        }))
        
        return result
    return wrapper

def setup_logger(name):
    """设置常规日志记录器"""
    logger = logging.getLogger(name)
    
    # 如果已经设置过处理器，直接返回
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.DEBUG)
    
    # 创建日志目录
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # 文件处理器
    log_file = os.path.join(log_dir, f'{name}.log')
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    
    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # 设置格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # 添加处理器
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

class PerformanceMonitor:
    """性能监控类"""
    def __init__(self, logger_name='performance'):
        self.logger = setup_performance_logger()
        self.start_time = None
        self.checkpoints = []
        
    def start(self):
        """开始监控"""
        self.start_time = time.time()
        self.checkpoints = []
        
    def checkpoint(self, name):
        """记录检查点"""
        if self.start_time is None:
            return
            
        current_time = time.time()
        elapsed = current_time - self.start_time
        self.checkpoints.append({
            'name': name,
            'time': current_time,
            'elapsed': elapsed
        })
        
    def stop(self, operation_name):
        """停止监控并记录结果"""
        if self.start_time is None:
            return
            
        end_time = time.time()
        total_duration = end_time - self.start_time
        
        # 记录性能数据
        performance_data = {
            'operation': operation_name,
            'total_duration': total_duration,
            'start_time': self.start_time,
            'end_time': end_time,
            'checkpoints': self.checkpoints
        }
        
        self.logger.info(json.dumps(performance_data))
        
        # 重置状态
        self.start_time = None
        self.checkpoints = []
        
        return performance_data

# 导出所有需要的函数和类
__all__ = ['setup_logger', 'log_performance', 'PerformanceMonitor', 'setup_performance_logger']