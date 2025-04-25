import cv2
import numpy as np
import paramiko
import os
import logging
import time
import base64  # 添加base64导入
import re  # 添加re导入
import uuid  # 添加uuid导入
from datetime import datetime
from .ssh_manager import SSHManager  # 替换为ssh_manager
from .log_config import setup_logger
from .button_clicker import ButtonClicker  # 添加ButtonClicker导入

# 获取日志记录器
logger = setup_logger(__name__)

BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
# 修改为使用frontend/public/screenshot目录存储截图
LOCAL_SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "public", "screenshot")

class GetLatestScreenshot:
    def __init__(self, ssh, test_name=None):
        """初始化时传入已建立的 SSH 连接和测试用例名称"""
        self.ssh = ssh
        self.test_name = test_name
        self.base_dir = BASE_IMG_DIR
        # 确保本地截图目录存在
        os.makedirs(LOCAL_SCREENSHOT_DIR, exist_ok=True)
        logger.debug(f"截图将保存到目录: {LOCAL_SCREENSHOT_DIR}")
        
        # 创建临时目录用于保存TIFF文件
        self.temp_dir = os.path.join(LOCAL_SCREENSHOT_DIR, "temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        logger.debug(f"临时文件将保存到目录: {self.temp_dir}")
        
        # 创建ButtonClicker实例
        self.button_clicker = ButtonClicker(ssh)
        
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

    def get_latest_screenshot(self, id=None):
        """
        获取最新的截图并保存到本地
        
        首先点击保存截图按钮，然后等待截图保存完成，再获取最新的截图
        将TIFF图像转换为PNG格式，并删除原始TIFF文件
        
        流程：
        1. 点击保存截图按钮
        2. 查找远程服务器上最新的TIFF截图
        3. 将TIFF截图下载到本地临时目录
        4. 将本地TIFF截图转换为PNG格式
        5. 删除本地临时TIFF截图
        6. 删除远程TIFF截图
        
        Args:
            id: 测试用例中的ID，用于标识截图
        
        Returns:
            解析后的图像对象
        """
        try:
            # 检查SSH连接是否有效
            if not self.ssh or not hasattr(self.ssh, 'exec_command'):
                logger.error("SSH连接无效，无法获取截图")
                raise Exception("SSH连接无效，无法获取截图")
            
            # 点击保存截图按钮
            logger.debug("点击保存截图按钮")
            if not self.button_clicker.click_button(button_name="保存截图"):
                logger.error("点击保存截图按钮失败")
                raise Exception("点击保存截图按钮失败")
            
            # 等待截图保存完成
            time.sleep(0.5)  # 等待0.5秒，确保截图保存完成
            
            # 检查远程目录结构，查找最新的截图文件
            logger.debug("检查远程目录结构")
            stdin, stdout, stderr = self.ssh.exec_command("find /ue -name '*.tiff' -o -name '*.tif' | sort -r | head -5")
            all_images = stdout.read().decode().strip().split('\n')
            error = stderr.read().decode().strip()
            
            if error:
                logger.warning(f"查找截图文件时出现警告: {error}")
            
            latest_file = None
            if all_images and all_images[0]:
                latest_file = all_images[0]
            else:
                # 尝试其他可能的目录
                logger.debug("在其他可能的目录中查找截图文件")
                possible_dirs = [
                    "/ue/ue_harddisk/ue_data",
                    "/ue/ue_harddisk",
                    "/ue/data",
                    "/data",
                    "/tmp"
                ]
                
                for dir_path in possible_dirs:
                    stdin, stdout, stderr = self.ssh.exec_command(f"ls -t {dir_path}/*.tiff 2>/dev/null | head -1 || ls -t {dir_path}/*.tif 2>/dev/null | head -1")
                    result = stdout.read().decode().strip()
                    if result:
                        latest_file = result
                        logger.debug(f"在目录 {dir_path} 中找到截图文件: {latest_file}")
                        break
                
                if not latest_file:
                    # 尝试查找所有截图文件
                    stdin, stdout, stderr = self.ssh.exec_command("find / -name '*.tiff' -o -name '*.tif' 2>/dev/null | sort -r | head -1")
                    latest_file = stdout.read().decode().strip()
                    if latest_file:
                        logger.debug(f"通过全局搜索找到截图文件: {latest_file}")
            
            if not latest_file:
                logger.error("未找到截图文件")
                raise Exception("未找到截图文件")
            
            logger.debug(f"找到最新截图文件: {latest_file}")
            
            # 提取原始文件名并将扩展名替换为.png
            original_filename = os.path.basename(latest_file)
            # 将.tiff或.tif替换为.png
            png_filename = re.sub(r'\.(tiff|tif)$', '.png', original_filename, flags=re.IGNORECASE)
            
            # 构建新文件名，包含id和时间戳
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            if id:
                filename = f"id_{id}_{timestamp}.png"
            else:
                filename = f"{timestamp}.png"
                
            # 为临时TIFF文件生成唯一文件名
            temp_tiff_filename = f"temp_{uuid.uuid4().hex}_{original_filename}"
            temp_tiff_path = os.path.join(self.temp_dir, temp_tiff_filename)
            
            # 目标PNG文件路径
            local_png_path = os.path.join(LOCAL_SCREENSHOT_DIR, filename)
                
            # 下载截图文件
            logger.debug("开始下载截图文件")
            stdin, stdout, stderr = self.ssh.exec_command(f"cat {latest_file} | base64")
            encoded_data = stdout.read().decode()
            error = stderr.read().decode().strip()
            
            if error:
                logger.warning(f"读取截图文件时出现警告: {error}")
            
            if not encoded_data:
                logger.error("无法读取截图文件")
                raise Exception("无法读取截图文件")
                
            # 解码截图数据
            logger.debug("解码截图数据")
            image_data = base64.b64decode(encoded_data)
            
            # 先将截图数据保存为本地临时TIFF文件
            logger.debug(f"保存临时TIFF文件到: {temp_tiff_path}")
            with open(temp_tiff_path, 'wb') as f:
                f.write(image_data)
            
            # 检查临时文件是否成功保存
            if not os.path.exists(temp_tiff_path):
                logger.error("临时TIFF文件保存失败")
                raise Exception("临时TIFF文件保存失败")
            
            logger.debug("临时TIFF文件保存成功，开始转换为PNG格式")
            
            # 使用OpenCV读取临时TIFF文件并转换为PNG格式
            try:
                # 读取TIFF图像
                image = cv2.imread(temp_tiff_path, cv2.IMREAD_UNCHANGED)
                if image is None:
                    logger.error(f"无法读取临时TIFF文件: {temp_tiff_path}")
                    raise Exception(f"无法读取临时TIFF文件: {temp_tiff_path}")
                
                # 保存为PNG格式
                cv2.imwrite(local_png_path, image)
                logger.debug(f"已保存PNG图像到: {local_png_path}")
                
                # 删除本地临时TIFF文件
                logger.debug(f"删除临时TIFF文件: {temp_tiff_path}")
                try:
                    os.remove(temp_tiff_path)
                    logger.debug(f"已删除临时TIFF文件")
                except Exception as e:
                    logger.warning(f"删除临时TIFF文件失败: {str(e)}")
                
                # 删除远程TIFF文件
                self.ssh.exec_command(f"rm -f {latest_file}")
                logger.debug(f"已删除远程TIFF文件: {latest_file}")
                
            except Exception as e:
                logger.error(f"截图转换失败: {str(e)}")
                # 尝试删除临时文件（如果存在）
                if os.path.exists(temp_tiff_path):
                    try:
                        os.remove(temp_tiff_path)
                        logger.debug(f"已清理临时TIFF文件")
                    except:
                        pass
                raise Exception(f"截图转换失败: {str(e)}")
                
            logger.debug("截图获取成功")
            return image
        except Exception as e:
            logger.error(f"获取截图失败: {str(e)}")
            return None 