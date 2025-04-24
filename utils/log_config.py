import logging
import os
import allure

# 添加TRACE日志级别 - 比DEBUG更详细
TRACE = 5  # 自定义级别，数值低于DEBUG(10)
logging.addLevelName(TRACE, "TRACE")

def trace(self, message, *args, **kwargs):
    """添加TRACE级别日志方法"""
    if self.isEnabledFor(TRACE):
        self._log(TRACE, message, args, **kwargs)

# 为Logger类添加trace方法
logging.Logger.trace = trace

def setup_logger(name):
    """设置日志记录器"""
    # 获取 logger 实例
    logger = logging.getLogger(name)
    logger.setLevel(TRACE)  # 设置logger的级别为TRACE，这样所有处理器都能收到消息

    # 设置日志文件路径 - 直接放在data目录下，不创建logs子目录
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    # 注意：不再创建logs子目录
    
    # 创建一个控制台处理器用于详细输出
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)  # 控制台只显示INFO及以上级别

    # 创建一个文件处理器，并设置编码为 UTF-8
    file_handler = logging.FileHandler(os.path.join(log_dir, "VP_180.log"), encoding="utf-8")
    file_handler.setLevel(TRACE)  # 文件处理器接收所有级别的日志
    
    # 注意：删除了VP_180_debug.log的处理器

    # 创建一个Allure处理器
    class AllureHandler(logging.Handler):
        def emit(self, record):
            if record.levelno >= logging.INFO:  # 只记录INFO及以上级别的日志到Allure
                msg = self.format(record)
                allure.attach(msg, name=record.name, attachment_type=allure.attachment_type.TEXT)

    allure_handler = AllureHandler()
    allure_handler.setLevel(logging.INFO)  # Allure处理器只接收INFO及以上级别的日志

    # 设置日志格式
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    allure_handler.setFormatter(formatter)

    # 如果 logger 没有处理器，则添加处理器
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        logger.addHandler(allure_handler)
        
    # 避免日志传播到父记录器
    logger.propagate = False

    return logger