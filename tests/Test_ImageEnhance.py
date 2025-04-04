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
from vp_180.utils.image_comparator import ImageComparator
from vp_180.utils.button_clicker import ButtonClicker
from vp_180.utils.Config import FUNCTIONS
from vp_180.utils.ssh_manager import SSHManager

from vp_180.utils.log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)

BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
SAVE_X, SAVE_Y = FUNCTIONS["SaveImage"]["touch"]
ENHANCE_X, ENHANCE_Y = FUNCTIONS["ImageEnhance"]["touch"]

@allure.epic("VP180自动化测试")
@allure.feature("图像处理功能")
class Test_ImageEnhance(unittest.TestCase):
    def __init__(self, ssh_connection, methodName='runTest'):
        super().__init__(methodName)
        if isinstance(ssh_connection, str):
            # 如果是字符串，说明是从环境变量传递的ID，需要重新获取SSH连接
            self.ssh = SSHManager.connect_ssh()
        else:
            self.ssh = ssh_connection
        self.image_fetcher = GetLatestImage(self.ssh, test_name=self.__class__.__name__)
        self.button_clicker = ButtonClicker(self.ssh)

    @allure.feature("图像增强功能")
    @allure.story("测试图像增强后是否正确存图")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.description("""
    测试步骤：
    1. 采集初始图片
    2. 触发图像增强
    3. 采集增强后图片
    4. 进行图像比对验证
    """)
    def runTest(self):
        """执行测试"""
        if not self.ssh:
            logging.error("SSH 连接未初始化，测试无法执行")
            allure.attach("SSH 连接未初始化", name="错误信息", attachment_type=allure.attachment_type.TEXT)
            return

        logging.info("📌 开始测试图像增强功能")
        allure.attach("开始测试图像增强功能", name="测试说明", attachment_type=allure.attachment_type.TEXT)

        # 1️⃣ 采集初始图片
        with allure.step("步骤一：采集初始图片"):
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "初始存图")
            img1 = self.image_fetcher.get_latest_image()

            if img1 is None:    
                logging.error("❌ 测试失败：获取初始图像失败")
                allure.attach("获取初始图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 2️⃣ 触发图像增强
        with allure.step("步骤二：触发图像增强"):
            self.button_clicker.click_button(ENHANCE_X, ENHANCE_Y, "图像增强")
            time.sleep(1)

        # 3️⃣ 采集增强后图片
        with allure.step("步骤三：采集增强后图片"):
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "存增强后图")
            img2 = self.image_fetcher.get_latest_image()

            if img2 is None:
                logging.error("❌ 测试失败：获取增强后图像失败")
                allure.attach("获取增强后图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 4️⃣ 进行图像比对
        with allure.step("步骤四：进行图像比对"):
            # 计算图像的对比度和亮度变化
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 计算对比度（使用标准差）
            contrast1 = np.std(gray1)
            contrast2 = np.std(gray2)
            contrast_change = (contrast2 - contrast1) / contrast1 * 100
            
            # 计算亮度（使用平均值）
            brightness1 = np.mean(gray1)
            brightness2 = np.mean(gray2)
            brightness_change = (brightness2 - brightness1) / brightness1 * 100

            # 判断是否有显著的图像增强效果
            has_enhancement = abs(contrast_change) > 5 or abs(brightness_change) > 5

            allure.attach(
                f"对比度变化: {contrast_change:.2f}%\n亮度变化: {brightness_change:.2f}%",
                name="比对详情",
                attachment_type=allure.attachment_type.TEXT 
            )

            if has_enhancement:
                logging.info("✅ 测试成功：图像已增强")
                allure.attach("图像已增强", name="测试结果", attachment_type=allure.attachment_type.TEXT)
            else:
                logging.error("❌ 测试失败：图像未增强")
                allure.attach("图像未增强", name="错误信息", attachment_type=allure.attachment_type.TEXT)

        logging.info("📌 图像增强测试结束")     