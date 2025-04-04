import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import subprocess
import pytest
import unittest
import time
import logging
import allure
import cv2
import numpy as np
import paramiko

from vp_180.utils.get_latest_image import GetLatestImage
from vp_180.utils.get_latest_screenshot import GetLatestScreenshot
from vp_180.utils.image_comparator import ImageComparator
from vp_180.utils.button_clicker import ButtonClicker
from vp_180.utils.Config import FUNCTIONS
from vp_180.utils.ssh_manager import SSHManager

from vp_180.utils.log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
SAVE_X, SAVE_Y = FUNCTIONS["SaveImage"]["touch"]
SCREEN_X, SCREEN_Y = FUNCTIONS["Screenshot"]["touch"]
FREEZE_X, FREEZE_Y = FUNCTIONS["Freeze"]["touch"]

@allure.epic("VP180自动化测试")
@allure.feature("图像处理功能")
class Test_Freeze(unittest.TestCase):
    def __init__(self, ssh_connection, methodName='runTest'):
        super().__init__(methodName)
        if isinstance(ssh_connection, str):
            # 如果是字符串，说明是从环境变量传递的ID，需要重新获取SSH连接
            self.ssh = SSHManager.connect_ssh()
        else:
            self.ssh = ssh_connection
        self.image_fetcher = GetLatestImage(self.ssh, test_name=self.__class__.__name__)
        self.screenshot_fetcher = GetLatestScreenshot(self.ssh, test_name=self.__class__.__name__)
        self.button_clicker = ButtonClicker(self.ssh)

    @allure.feature("图像冻结功能")
    @allure.story("测试图像冻结后是否正确存图")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.description("""
    测试步骤：
    1. 采集初始图片
    2. 触发图像冻结
    3. 采集冻结后图片
    4. 进行图像比对验证
    5. 再次采集图片验证冻结状态
    """)
    def runTest(self):
        """执行测试"""
        if not self.ssh:
            logging.error("SSH 连接未初始化，测试无法执行")
            allure.attach("SSH 连接未初始化", name="错误信息", attachment_type=allure.attachment_type.TEXT)
            return

        logging.info("📌 开始测试图像冻结功能")
        allure.attach("开始测试图像冻结功能", name="测试说明", attachment_type=allure.attachment_type.TEXT)

        # 1️⃣ 采集初始图片
        with allure.step("步骤一：采集初始图片"):
            self.button_clicker.click_button(SCREEN_X, SCREEN_Y, "初始截图")
            time.sleep(1)
            img1 = self.screenshot_fetcher.get_latest_screenshot()

            if img1 is None:    
                logging.error("❌ 测试失败：获取初始图像失败")
                allure.attach("获取初始图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 2️⃣ 触发图像冻结
        with allure.step("步骤二：触发图像冻结"):
            self.button_clicker.click_button(FREEZE_X, FREEZE_Y, "图像冻结")
            time.sleep(1)

        # 3️⃣ 采集冻结后图片
        with allure.step("步骤三：采集冻结后图片"):
            self.button_clicker.click_button(SCREEN_X, SCREEN_Y, "冻结截图")
            img2 = self.screenshot_fetcher.get_latest_screenshot()

            if img2 is None:
                logging.error("❌ 测试失败：获取冻结图像失败")
                allure.attach("获取冻结图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 4️⃣ 进行图像比对
        with allure.step("步骤四：进行图像比对"):
            # 计算两张图片的相似度
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 使用结构相似性指数（SSIM）比较图像
            ssim_index = ImageComparator.is_ssim(img1, img2)
            
            allure.attach(
                f"SSIM相似度指数: {ssim_index}",
                name="比对详情",
                attachment_type=allure.attachment_type.TEXT
            )

        # 5️⃣ 验证取消冻结状态        
        with allure.step("步骤五：验证取消冻结状态"):
            time.sleep(1)  # 等待一段时间
            self.button_clicker.click_button(FREEZE_X, FREEZE_Y, "取消冻结")
            time.sleep(1)  # 等待取消冻结生效
            
            # 获取取消冻结后的图像
            self.button_clicker.click_button(SCREEN_X, SCREEN_Y, "取消冻结后截图")
            img3 = self.screenshot_fetcher.get_latest_screenshot()

            # 计算两张图片的相似度
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            gray3 = cv2.cvtColor(img3, cv2.COLOR_BGR2GRAY)
            
            # 使用结构相似性指数（SSIM）比较图像
            ssim_index = ImageComparator.is_ssim(img2, img3)
            
            allure.attach(
                f"SSIM相似度指数: {ssim_index}",
                name="比对详情",
                attachment_type=allure.attachment_type.TEXT
            )
            if ssim_index:
                logging.info("✅ 测试成功：图像已冻结")
                allure.attach("图像已冻结", name="测试结果", attachment_type=allure.attachment_type.TEXT)
            else:
                logging.error("❌ 测试失败：图像未冻结")
                allure.attach("图像未冻结", name="错误信息", attachment_type=allure.attachment_type.TEXT)
            logging.info("📌 图像冻结测试结束") 