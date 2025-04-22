import logging
import os
import allure

def setup_logger(name):
    """设置日志记录器"""
    # 获取 logger 实例
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # 设置logger的级别为DEBUG，这样所有处理器都能收到消息

    # 设置日志目录
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'logs')
    os.makedirs(log_dir, exist_ok=True)

    # 创建一个文件处理器，并设置编码为 UTF-8
    file_handler = logging.FileHandler(os.path.join(log_dir, "VP_180.log"), encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)  # 文件处理器接收DEBUG及以上级别的日志

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
        "%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%H:%M:%S"  # 只显示时:分:秒
    )
    file_handler.setFormatter(formatter)
    allure_handler.setFormatter(formatter)

    # 如果 logger 没有处理器，则添加处理器
    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(allure_handler)

    return logger