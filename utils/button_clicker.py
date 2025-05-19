"""
按钮点击操作模块

该模块提供设备按钮点击和触摸操作的功能。主要功能包括：
1. 执行按钮点击操作
2. 支持长按操作
3. 提供坐标点击功能
4. 操作结果反馈

主要类：
- ButtonClicker: 负责执行各种点击和触摸操作
"""

# vp_180/utils/button_clicker.py
import os
import time
import logging
import random
from .log_config import setup_logger
from .ssh_manager import SSHManager
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
    logger.error(f"加载FUNCTIONS配置时发生未知错误: {str(e)}")
    FUNCTIONS = {}

class ButtonClicker:
    def __init__(self, ssh_connection=None):
        """初始化时传入已建立的 SSH 连接（可选）"""
        # 获取SSHManager实例
        self.ssh_manager = SSHManager.get_instance()
        self.ssh = ssh_connection
        
        if not FUNCTIONS:
            logger.warning("FUNCTIONS配置为空，按钮名称查找功能可能无法使用")
        
        # 屏幕分辨率 - 根据实际情况调整
        self.screen_width = 1920  # 默认宽度，实际应从设备获取
        self.screen_height = 1080  # 默认高度，实际应从设备获取
        
        # 随机点击的区域划分
        self.grid_cols = 8  # 水平划分为8列
        self.grid_rows = 10  # 垂直划分为10行
        
        # 随机点击类型概率分布
        self.click_type_probabilities = {
            'single': 0.7,  # 单点点击概率为70%
            'double': 0.2,  # 双点点击概率为20%
            'triple': 0.1   # 三点点击概率为10%
        }
        
        # 重试配置
        self.max_retries = 3
        self.retry_interval = 1  # 秒
    
    def _ensure_ssh_connection(self):
        """确保SSH连接有效，如果无效则尝试重新连接
        
        Returns:
            paramiko.SSHClient: 有效的SSH连接
            None: 如果无法获取有效连接
        """
        # 首先检查现有连接是否有效
        if self.ssh and hasattr(self.ssh, 'exec_command'):
            try:
                transport = self.ssh.get_transport()
                if transport and transport.is_active():
                    return self.ssh
            except:
                pass
        
        # 如果现有连接无效，尝试通过SSHManager获取连接
        try:
            if not SSHManager.is_connected():
                logger.info("SSH连接已断开，尝试重新连接")
                self.ssh = self.ssh_manager.reconnect()
            else:
                self.ssh = SSHManager.get_client()
            
            if not self.ssh:
                logger.error("无法获取有效的SSH连接")
                return None
            
            return self.ssh
            
        except Exception as e:
            logger.error(f"确保SSH连接时出错: {str(e)}")
            return None
    
    def click_button(self, x=None, y=None, button_name=None, description="按钮", touch_duration=None):
        """
        点击指定坐标或指定名称的按钮
        :param x: 触摸屏X坐标（可选）
        :param y: 触摸屏Y坐标（可选）
        :param button_name: 按钮名称，对应Config.py中FUNCTIONS的chinese_name（可选）
        :param description: 按钮描述
        :param touch_duration: 触摸时长（秒），如果不指定则使用默认点击时长
        """
        # 如果提供了按钮名称且不为空，则查找对应的坐标
        if button_name and button_name.strip():
            if not FUNCTIONS:
                logger.error("FUNCTIONS配置未正确加载，无法通过按钮名称查找")
                return False
                
            found = False
            for key, value in FUNCTIONS.items():
                if value.get('chinese_name') == button_name:
                    x, y = value['screen']
                    description = button_name
                    found = True
                    break
            
            if not found:
                logger.error(f"未找到名称为 {button_name} 的按钮")
                return False
        
        # 如果没有提供坐标，则返回错误
        if x is None or y is None:
            logger.error("未提供按钮坐标")
            return False
        # 将触摸屏坐标转换为屏幕坐标
        duration_desc = f" (触摸时长: {touch_duration}秒)" if touch_duration is not None else ""
        logger.debug(f"点击{description}按钮 ({x}, {y}){duration_desc}")
        
        # 重试机制
        for attempt in range(self.max_retries):
            # 确保SSH连接有效
            ssh = self._ensure_ssh_connection()
            if not ssh:
                logger.error(f"第{attempt + 1}次尝试：无法获取有效的SSH连接")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
            
            try:
                
                
                # 构建触摸点击命令
                command = f"python3 /app/jzj/touch_click.py {x} {y}"
                if touch_duration is not None:
                    try:
                        duration = float(touch_duration)
                        if duration <= 0:
                            raise ValueError("触摸时长必须大于0秒")
                        command += f" {duration}"
                    except ValueError as ve:
                        logger.error(f"触摸时长参数错误: {str(ve)}")
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_interval)
                        continue
                logger.debug(f"执行命令: {command}")
                
                stdin, stdout, stderr = ssh.exec_command(command)
                
                # 获取命令输出
                output = stdout.read().decode().strip()
                error = stderr.read().decode().strip()
                
                if error:
                    logger.error(f"点击按钮出错: {error}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_interval)
                    continue
                    
                if "❌" in output:  # 检查是否有错误标记
                    logger.error(f"点击按钮失败: {output}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_interval)
                    continue
                    
                logger.debug(f"点击按钮成功: {output}")
                return True
                
            except Exception as e:
                logger.error(f"点击按钮异常: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
        
        return False
        
    def long_click(self, x=None, y=None, button_name=None, description="按钮"):
        """
        长按指定坐标或指定名称的按钮
        :param x: 触摸屏X坐标（可选）
        :param y: 触摸屏Y坐标（可选）
        :param button_name: 按钮名称，对应Config.py中FUNCTIONS的chinese_name（可选）
        :param description: 按钮描述
        """
        # 如果提供了按钮名称且不为空，则查找对应的坐标
        if button_name and button_name.strip():
            if not FUNCTIONS:
                logger.error("FUNCTIONS配置未正确加载，无法通过按钮名称查找")
                return False
                
            found = False
            for key, value in FUNCTIONS.items():
                if value.get('chinese_name') == button_name:
                    x, y = value['screen']
                    description = button_name
                    found = True
                    break
            
            if not found:
                logger.error(f"未找到名称为 {button_name} 的按钮")
                return False
        
        # 如果没有提供坐标，则返回错误
        if x is None or y is None:
            logger.error("未提供按钮坐标")
            return False
            
        logger.debug(f"长按{description}按钮 ({x}, {y})")
        
        # 重试机制
        for attempt in range(self.max_retries):
            # 确保SSH连接有效
            ssh = self._ensure_ssh_connection()
            if not ssh:
                logger.error(f"第{attempt + 1}次尝试：无法获取有效的SSH连接")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
            
            try:
                # 构建长按点击命令，使用touch_click.py并添加长按参数
                command = f"python3 /app/jzj/touch_click.py {x} {y} --long-press"
                logger.debug(f"执行命令: {command}")
                
                stdin, stdout, stderr = ssh.exec_command(command)
                
                # 获取命令输出
                output = stdout.read().decode().strip()
                error = stderr.read().decode().strip()
                
                if error:
                    logger.error(f"长按按钮出错: {error}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_interval)
                    continue
                    
                logger.debug(f"长按按钮成功: {output}")
                return True
                
            except Exception as e:
                logger.error(f"长按按钮异常: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
        
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
        
        # 重试机制
        for attempt in range(self.max_retries):
            # 确保SSH连接有效
            ssh = self._ensure_ssh_connection()
            if not ssh:
                logger.error(f"第{attempt + 1}次尝试：无法获取有效的SSH连接")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
            
            try:
                # 构建滑动命令，使用touch_click.py并添加滑动参数
                command = f"python3 /app/jzj/touch_click.py {x1} {y1} --slide-to {x2} {y2}"
                logger.debug(f"执行命令: {command}")
                
                stdin, stdout, stderr = ssh.exec_command(command)
                
                # 获取命令输出
                output = stdout.read().decode().strip()
                error = stderr.read().decode().strip()
                
                if error:
                    logger.error(f"滑动操作出错: {error}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_interval)
                    continue
                    
                logger.debug(f"滑动操作成功: {output}")
                return True
                
            except Exception as e:
                logger.error(f"滑动操作异常: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
        
        return False
            
    def _get_random_grid_point(self):
        """获取一个随机网格点的坐标"""
        # 随机选择一个网格单元
        col = random.randint(0, self.grid_cols - 1)
        row = random.randint(0, self.grid_rows - 1)
        
        # 计算网格单元的中心点坐标
        cell_width = self.screen_width / self.grid_cols
        cell_height = self.screen_height / self.grid_rows
        
        x = int(col * cell_width + cell_width / 2)
        y = int(row * cell_height + cell_height / 2)
        
        return x, y
    
    def random_click(self, click_type=None):
        """
        执行随机点击操作
        :param click_type: 点击类型，可以是 'single', 'double', 'triple' 或 None (随机选择)
        :return: 是否点击成功
        """
        # 如果未指定点击类型，则根据概率分布随机选择
        if click_type is None:
            rand = random.random()
            if rand < self.click_type_probabilities['single']:
                click_type = 'single'
            elif rand < self.click_type_probabilities['single'] + self.click_type_probabilities['double']:
                click_type = 'double'
            else:
                click_type = 'triple'
        
        logger.info(f"执行{click_type}点随机点击")
        
        # 重试机制
        for attempt in range(self.max_retries):
            # 确保SSH连接有效
            ssh = self._ensure_ssh_connection()
            if not ssh:
                logger.error(f"第{attempt + 1}次尝试：无法获取有效的SSH连接")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
            
            try:
                if click_type == 'single':
                    # 单点点击
                    x, y = self._get_random_grid_point()
                    command = f"python3 /app/jzj/touch_click.py {x} {y}"
                    logger.debug(f"执行单点随机点击: ({x}, {y})")
                    
                elif click_type == 'double':
                    # 双点点击（同时点击两个点）
                    x1, y1 = self._get_random_grid_point()
                    x2, y2 = self._get_random_grid_point()
                    # 确保两个点不重叠
                    while abs(x1 - x2) < 50 and abs(y1 - y2) < 50:
                        x2, y2 = self._get_random_grid_point()
                    
                    command = f"python3 /app/jzj/touch_click.py {x1} {y1} --multi-touch {x2} {y2}"
                    logger.debug(f"执行双点随机点击: ({x1}, {y1}), ({x2}, {y2})")
                    
                else:  # triple
                    # 三点点击（同时点击三个点）
                    x1, y1 = self._get_random_grid_point()
                    x2, y2 = self._get_random_grid_point()
                    x3, y3 = self._get_random_grid_point()
                    
                    # 确保三个点都不重叠
                    while abs(x1 - x2) < 50 and abs(y1 - y2) < 50:
                        x2, y2 = self._get_random_grid_point()
                    while (abs(x1 - x3) < 50 and abs(y1 - y3) < 50) or (abs(x2 - x3) < 50 and abs(y2 - y3) < 50):
                        x3, y3 = self._get_random_grid_point()
                    
                    command = f"python3 /app/jzj/touch_click.py {x1} {y1} --multi-touch {x2} {y2} {x3} {y3}"
                    logger.debug(f"执行三点随机点击: ({x1}, {y1}), ({x2}, {y2}), ({x3}, {y3})")
                
                # 执行命令
                stdin, stdout, stderr = ssh.exec_command(command)
                
                # 获取命令输出
                output = stdout.read().decode().strip()
                error = stderr.read().decode().strip()
                
                if error:
                    logger.error(f"随机点击出错: {error}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_interval)
                    continue
                    
                logger.debug(f"随机点击成功: {output}")
                return True
                
            except Exception as e:
                logger.error(f"随机点击异常: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_interval)
                continue
        
        return False
            
    def single_random_click(self):
        """执行单点随机点击"""
        return self.random_click('single')
        
    def double_random_click(self):
        """执行双点随机点击"""
        return self.random_click('double')
        
    def triple_random_click(self):
        """执行三点随机点击"""
        return self.random_click('triple')
if __name__ == "__main__":
    print("开始调试 clicker.long_click")
    clicker = ButtonClicker()
    print("开始调试 clicker.long_click，第二步")
    clicker.long_click(button_name="电子放大")
    print("结束调试 clicker.long_click")
