import cv2
import numpy as np
import paramiko
import os
import logging
from datetime import datetime
from .ssh_manager import SSHManager  # 替换为ssh_manager
from .log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
# 使用data/screenshots目录存储截图
LOCAL_SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "screenshots")

class GetLatestScreenshot:
    def __init__(self, ssh, test_name=None):
        """初始化时传入已建立的 SSH 连接和测试用例名称"""
        self.ssh = ssh
        self.test_name = test_name
        # 确保本地截图目录存在
        os.makedirs(LOCAL_SCREENSHOT_DIR, exist_ok=True)
        # logger.debug(f"本地截图保存目录: {LOCAL_SCREENSHOT_DIR}")

    def execute_command(self, command):
        """封装 SSH 执行命令的方法"""
        # logger.debug(f"执行命令: {command}")
        stdin, stdout, stderr = self.ssh.exec_command(command)
        result = stdout.read().decode().strip()
        error = stderr.read().decode().strip()
        if error:
            logger.error(f"命令执行错误: {error}")
        return result

    def get_latest_screenshot(self, id=None):
        """
        获取最新的截图并保存到本地
        
        Args:
            id: 测试用例中的ID，用于标识截图
        
        Returns:
            解析后的图像对象
        """
        
        # 获取最新目录
        latest_dir = self.execute_command(f"ls -td {BASE_IMG_DIR}/* | head -n 1")
        if not latest_dir:
            logger.error("未找到截图目录")
            return None

        # 获取最新截图路径 (直接获取目录下的最新图片，不进入A子目录)
        img_path = self.execute_command(f"ls -t {latest_dir}/*.tiff {latest_dir}/*.jpg {latest_dir}/*.png {latest_dir}/*.jpeg 2>/dev/null | head -n 1")
        if not img_path:
            logger.error("未找到最新的截图")
            return None

        # logger.debug(f"最新截图路径: {img_path}")

        # 获取原始文件名和扩展名
        original_filename = os.path.basename(img_path)
        file_extension = os.path.splitext(original_filename)[1]
        
        # 生成新文件名，只包含id和时间戳
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        if id:
            new_filename = f"id_{id}_{timestamp}{file_extension}"
        else:
            new_filename = f"{timestamp}{file_extension}"
            
        local_path = os.path.join(LOCAL_SCREENSHOT_DIR, new_filename)

        # 通过 SFTP 读取远程截图
        try:
            # logger.debug("开始通过 SFTP 读取截图")
            sftp = self.ssh.open_sftp()
            with sftp.open(img_path, 'rb') as remote_file:
                image_data = remote_file.read()
            sftp.close()
            # logger.debug("SFTP 读取截图完成")
        except Exception as e:
            logger.error(f"无法读取远程截图 {img_path}，错误信息：{e}")
            return None

        # 使用 OpenCV 解析图像
        try:
            # logger.debug("开始解析截图数据")
            image = cv2.imdecode(np.frombuffer(image_data, dtype=np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                logger.error(f"无法解码截图 {img_path}")
                return None
            
            # 保存截图到本地
            cv2.imwrite(local_path, image)
            logger.debug(f"截图已保存到本地: {local_path}")
            
            # logger.debug("截图解析成功") # 截图解析成功
            return image
        except Exception as e:
            logger.error(f"截图解析失败：{e}")
            return None 