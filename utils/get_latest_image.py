import cv2
import numpy as np
import paramiko
import os
import logging
from datetime import datetime
from .ssh_manager import SSHManager  # 替换为ssh_manager
from .log_config import setup_logger
import re
import time

# 获取日志记录器
logger = setup_logger(__name__)

# 修改BASE_IMG_DIR确保路径正确
BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
# 使用data/img目录存储图片
LOCAL_IMG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "img")

class GetLatestImage:
    def __init__(self, ssh_connection, test_name="Test"):
        """初始化时传入已建立的 SSH 连接"""
        self.ssh = ssh_connection
        self.test_name = test_name
        self.base_dir = "/ue/ue_harddisk/ue_data"
        # 更新本地目录路径
        self.local_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "img")
        os.makedirs(self.local_dir, exist_ok=True)
        logger.debug("初始化 GetLatestImage 实例")
        logger.debug(f"本地图像保存目录: {self.local_dir}")
        
        # 检查远程目录是否存在
        if self.ssh and hasattr(self.ssh, 'exec_command'):
            try:
                # 检查基础目录是否存在
                stdin, stdout, stderr = self.ssh.exec_command(f"ls -la {self.base_dir} 2>/dev/null || echo 'NOT_FOUND'")
                result = stdout.read().decode().strip()
                if "NOT_FOUND" in result:
                    logger.warning(f"基础目录 {self.base_dir} 不存在，尝试创建")
                    self.ssh.exec_command(f"mkdir -p {self.base_dir}")
                    logger.debug(f"已创建目录: {self.base_dir}")
            except Exception as e:
                logger.error(f"检查远程目录时出错: {str(e)}")

    def execute_command(self, command):
        """封装 SSH 执行命令的方法"""
        logger.debug(f"执行命令: {command}")
        stdin, stdout, stderr = self.ssh.exec_command(command)
        result = stdout.read().decode().strip()
        error = stderr.read().decode().strip()
        if error:
            logger.error(f"命令执行错误: {error}")
        return result

    def get_latest_image(self, id=None):
        """
        获取最新的图像文件，返回图像数据
        
        Args:
            id: 测试用例中的ID，用于标识图像
            
        Returns:
            解析后的图像对象
        """
        try:
            # 检查SSH连接是否有效
            if not self.ssh or not hasattr(self.ssh, 'exec_command'):
                logger.error("SSH连接无效，无法获取图像")
                raise Exception("SSH连接无效，无法获取图像")
            
            # 获取最新的图像文件
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            
            # 构建文件名，只包含id和时间戳
            if id:
                filename = f"id_{id}_{timestamp}.tiff"
            else:
                filename = f"{timestamp}.tiff"
            
            local_path = os.path.join(self.local_dir, filename)
            
            # 检查远程目录结构
            logger.debug("检查远程目录结构")
            stdin, stdout, stderr = self.ssh.exec_command("find /ue -name '*.tiff' -o -name '*.tif' | sort -r | head -5")
            all_images = stdout.read().decode().strip().split('\n')
            error = stderr.read().decode().strip()
            
            if error:
                logger.warning(f"查找图像文件时出现警告: {error}")
            
            if all_images and all_images[0]:
                logger.debug(f"找到以下图像文件: {all_images}")
                latest_file = all_images[0]
            else:
                # 尝试其他可能的目录
                logger.debug("在其他可能的目录中查找图像文件")
                possible_dirs = [
                    "/ue/ue_harddisk/ue_data",
                    "/ue/ue_harddisk",
                    "/ue/data",
                    "/data",
                    "/tmp"
                ]
                
                latest_file = None
                for dir_path in possible_dirs:
                    stdin, stdout, stderr = self.ssh.exec_command(f"ls -t {dir_path}/*.tiff 2>/dev/null | head -1 || ls -t {dir_path}/*.tif 2>/dev/null | head -1")
                    result = stdout.read().decode().strip()
                    if result:
                        latest_file = result
                        logger.debug(f"在目录 {dir_path} 中找到图像文件: {latest_file}")
                        break
                
                if not latest_file:
                    # 尝试查找所有图像文件
                    stdin, stdout, stderr = self.ssh.exec_command("find / -name '*.tiff' -o -name '*.tif' 2>/dev/null | sort -r | head -1")
                    latest_file = stdout.read().decode().strip()
                    if latest_file:
                        logger.debug(f"通过全局搜索找到图像文件: {latest_file}")
            
            if not latest_file:
                logger.error("未找到图像文件")
                raise Exception("未找到图像文件")
            
            logger.debug(f"找到最新图像文件: {latest_file}")
                
            # 下载图像文件
            logger.debug("开始下载图像文件")
            stdin, stdout, stderr = self.ssh.exec_command(f"cat {latest_file} | base64")
            encoded_data = stdout.read().decode()
            error = stderr.read().decode().strip()
            
            if error:
                logger.warning(f"读取图像文件时出现警告: {error}")
            
            if not encoded_data:
                logger.error("无法读取图像文件")
                raise Exception("无法读取图像文件")
                
            # 解码并保存图像
            logger.debug("解码并保存图像")
            import base64
            with open(local_path, "wb") as f:
                image_data = base64.b64decode(encoded_data)
                f.write(image_data)
                
            logger.debug(f"已保存图像到: {local_path}")
            
            # 读取图像数据并返回
            logger.debug("读取图像数据")
            image = cv2.imread(local_path)
            if image is None:
                logger.error(f"无法读取图像: {local_path}")
                raise Exception(f"无法读取图像: {local_path}")
                
            logger.debug("图像获取成功")
            return image
        except Exception as e:
            logger.error(f"获取图像失败: {str(e)}")
            raise
