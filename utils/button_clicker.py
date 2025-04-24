# vp_180/utils/button_clicker.py
import os
import time
import logging
from .log_config import setup_logger
try:
    from .Config import FUNCTIONS
    logger = setup_logger(__name__)
    # logger.info("成功加载FUNCTIONS配置")
except ImportError as e:
    logger = setup_logger(__name__)
    logger.error(f"加载FUNCTIONS配置失败: {str(e)}")
    FUNCTIONS = {}
except Exception as e:
    logger = setup_logger(__name__)
    logger.error(f"加载FUNCTIONS时发生未知错误: {str(e)}")
    FUNCTIONS = {}

class ButtonClicker:
    def __init__(self, ssh_connection):
        """初始化时传入已建立的 SSH 连接"""
        self.ssh = ssh_connection
        if not FUNCTIONS:
            logger.warning("FUNCTIONS配置为空，按钮名称查找功能可能无法使用")
    
    def click_button(self, x=None, y=None, button_name=None, description="按钮"):
        """
        点击指定坐标或指定名称的按钮
        :param x: 屏幕X坐标（可选）
        :param y: 屏幕Y坐标（可选）
        :param button_name: 按钮名称，对应Config.py中FUNCTIONS的chinese_name（可选）
        :param description: 按钮描述
        """
        # 如果提供了按钮名称，则查找对应的坐标
        if button_name is not None:
            if not FUNCTIONS:
                logger.error("FUNCTIONS配置未正确加载，无法通过按钮名称查找")
                return False
                
            found = False
            for key, value in FUNCTIONS.items():
                if value.get('chinese_name') == button_name:
                    x, y = value['touch']
                    description = button_name
                    found = True
                    logger.debug(f"找到按钮 {button_name} 的坐标: ({x}, {y})")
                    break
            
            if not found:
                logger.error(f"未找到名称为 {button_name} 的按钮")
                return False
        
        # 如果没有提供坐标也没有提供按钮名称，则返回错误
        if x is None or y is None:
            logger.error("未提供按钮坐标或按钮名称")
            return False
            
        logger.debug(f"点击{description}按钮 ({x}, {y})")
        
        # 检查SSH连接是否有效
        if not self.ssh or not hasattr(self.ssh, 'exec_command'):
            logger.error("SSH连接无效，无法点击按钮")
            return False
        
        try:
            # 构建触摸点击命令
            command = f"python3 /app/jzj/touch_click.py {x} {y}"
            logger.debug(f"执行命令: {command}")
            
            stdin, stdout, stderr = self.ssh.exec_command(command)
            
            # 获取命令输出
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()
            
            if error:
                logger.error(f"点击按钮出错: {error}")
                return False
                
            logger.debug(f"点击按钮成功: {output}")
            return True
        except Exception as e:
            logger.error(f"点击按钮异常: {str(e)}")
            return False
        
    def long_click(self, x, y, description="按钮"):
        """长按指定坐标的按钮"""
        logger.debug(f"长按{description}按钮 ({x}, {y})")
        
        # 检查SSH连接是否有效
        if not self.ssh or not hasattr(self.ssh, 'exec_command'):
            logger.error("SSH连接无效，无法长按按钮")
            return False
        
        try:
            # 构建长按点击命令，使用touch_click.py并添加长按参数
            command = f"python3 /app/jzj/touch_click.py {x} {y} --long-press"
            logger.debug(f"执行命令: {command}")
            
            stdin, stdout, stderr = self.ssh.exec_command(command)
            
            # 获取命令输出
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()
            
            if error:
                logger.error(f"长按按钮出错: {error}")
                return False
                
            logger.debug(f"长按按钮成功: {output}")
            return True
        except Exception as e:
            logger.error(f"长按按钮异常: {str(e)}")
            return False

    def slide(self, x1, y1, x2, y2, description="滑动"):
        """
        从一个点滑动到另一个点
        :param x1: 起始点X坐标
        :param y1: 起始点Y坐标
        :param x2: 终点X坐标
        :param y2: 终点Y坐标
        :param description: 滑动操作描述
        :return: 是否滑动成功
        """
        logger.debug(f"{description}操作: 从 ({x1}, {y1}) 滑动到 ({x2}, {y2})")
        
        # 检查SSH连接是否有效
        if not self.ssh or not hasattr(self.ssh, 'exec_command'):
            logger.error("SSH连接无效，无法执行滑动操作")
            return False
        
        try:
            # 构建滑动命令，使用touch_click.py并添加滑动参数
            command = f"python3 /app/jzj/touch_click.py {x1} {y1} --slide-to {x2} {y2}"
            logger.debug(f"执行命令: {command}")
            
            stdin, stdout, stderr = self.ssh.exec_command(command)
            
            # 获取命令输出
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()
            
            if error:
                logger.error(f"滑动操作出错: {error}")
                return False
                
            logger.debug(f"滑动操作成功: {output}")
            return True
        except Exception as e:
            logger.error(f"滑动操作异常: {str(e)}")
            return False
