import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import unittest
import time
import logging
import cv2
import numpy as np
import paramiko

from vp_180.utils.get_latest_image import GetLatestImage
from vp_180.utils.image_comparator import ImageComparator
from vp_180.utils.button_clicker import ButtonClicker
from vp_180.utils.Config import FUNCTIONS
from vp_180.utils.ssh_manager import SSHManager

from vp_180.utils.log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
SAVE_X, SAVE_Y = FUNCTIONS["SaveImage"]["touch"]
ZOOM_X, ZOOM_Y = FUNCTIONS["Zoom"]["touch"]


class Test_Zoom(unittest.TestCase):
    def __init__(self, ssh_connection, methodName='runTest'):
        super().__init__(methodName)
        
        print(f"初始化Test_Zoom，SSH连接ID: {id(ssh_connection)}")
        
        # 使用传入的SSH连接
        self.ssh = ssh_connection
        
        # 如果传入的是None或SSH连接无效，尝试重新连接
        if self.ssh is None or not hasattr(self.ssh, 'exec_command'):
            print("警告：SSH连接无效，尝试重新连接")
            try:
                ssh_manager = SSHManager()
                self.ssh = ssh_manager.connect()
                if not self.ssh:
                    print("错误：无法建立SSH连接")
            except Exception as e:
                print(f"错误：建立SSH连接失败 - {str(e)}")
        
        # 初始化其他组件
        if self.ssh and hasattr(self.ssh, 'exec_command'):
            print("初始化image_fetcher和button_clicker")
            self.image_fetcher = GetLatestImage(self.ssh, test_name=self.__class__.__name__)
            self.button_clicker = ButtonClicker(self.ssh)
        else:
            print("错误：SSH连接未初始化或无效，无法创建image_fetcher和button_clicker")
    
    def runTest(self):
        """执行测试"""
        # 检查SSH连接是否有效
        if not self.ssh:
            logging.error("SSH连接未初始化，测试无法执行")
            self.fail("SSH连接未初始化，测试无法执行")
            return
        
        try:
            # 1️⃣ 采集初始图片
            logging.info("步骤一：采集初始图片")
            # 点击存图按钮
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "初始存图按钮")
            time.sleep(1)  # 等待存图完成
            
            # 获取初始图片
            img1 = self.image_fetcher.get_latest_image()
            
            # 2️⃣ 触发电子放大
            logging.info("步骤二：触发电子放大")
            # 点击放大按钮
            self.button_clicker.click_button(ZOOM_X, ZOOM_Y, "放大按钮")
            time.sleep(1)  # 等待放大效果
            
            # 3️⃣ 采集放大后图片
            logging.info("步骤三：采集放大后图片")
            # 点击存图按钮
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "存放大图按钮")
            time.sleep(1)  # 等待存图完成
            
            # 获取放大后图片
            img2 = self.image_fetcher.get_latest_image()
            
            # 4️⃣ 进行图像比对
            logging.info("步骤四：进行图像比对")
            # 进行图像比对
            try:
                zoomed_orb = ImageComparator.is_orb(img1, img2)
                zoomed_ssim = ImageComparator.is_ssim(img1, img2)
                
                logging.info(f"ORB比对结果: {zoomed_orb}")
                logging.info(f"SSIM比对结果: {zoomed_ssim}")
                
                # 根据两种比对方法的结果来判断测试是否成功
                test_success = zoomed_orb or zoomed_ssim  # 任一方法判断为放大即为成功
                
                if test_success:
                    logging.info("✅ 测试成功：图像已放大")
                else:
                    logging.error("❌ 测试失败：图像未放大")
                
                # 返回测试结果
                self.assertTrue(test_success, "图像放大测试失败")
            except Exception as e:
                logging.error(f"图像比对失败: {str(e)}")
                self.fail(f"图像比对失败: {str(e)}")
        
            logging.info("📌 电子放大测试结束")
        except Exception as e:
            logging.error(f"测试执行过程中出错: {str(e)}")
            self.fail(f"测试执行过程中出错: {str(e)}")
