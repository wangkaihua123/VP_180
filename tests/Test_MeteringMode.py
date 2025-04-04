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
METER_X, METER_Y = FUNCTIONS["MeteringMode"]["touch"]

@allure.epic("VP180自动化测试")
@allure.feature("图像处理功能")
class Test_MeteringMode(unittest.TestCase):
    def __init__(self, ssh_connection, methodName='runTest'):
        super().__init__(methodName)
        if isinstance(ssh_connection, str):
            # 如果是字符串，说明是从环境变量传递的ID，需要重新获取SSH连接
            self.ssh = SSHManager.connect_ssh()
        else:
            self.ssh = ssh_connection
        self.image_fetcher = GetLatestImage(self.ssh, test_name=self.__class__.__name__)
        self.button_clicker = ButtonClicker(self.ssh)

    @allure.feature("测光模式功能")
    @allure.story("测试测光模式切换是否正确")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.description("""
    测试步骤：
    1. 采集初始图片
    2. 切换测光模式
    3. 采集切换后图片
    4. 进行图像分析验证
    5. 再次切换并验证
    """)
    def runTest(self):
        """执行测试"""
        if not self.ssh:
            logging.error("SSH 连接未初始化，测试无法执行")
            allure.attach("SSH 连接未初始化", name="错误信息", attachment_type=allure.attachment_type.TEXT)
            return

        logging.info("📌 开始测试测光模式功能")
        allure.attach("开始测试测光模式功能", name="测试说明", attachment_type=allure.attachment_type.TEXT)

        # 1️⃣ 采集初始图片
        with allure.step("步骤一：采集初始图片"):
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "初始存图")
            img1 = self.image_fetcher.get_latest_image()

            if img1 is None:    
                logging.error("❌ 测试失败：获取初始图像失败")
                allure.attach("获取初始图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 2️⃣ 切换测光模式
        with allure.step("步骤二：切换测光模式"):
            self.button_clicker.click_button(METER_X, METER_Y, "测光模式")
            time.sleep(1)

        # 3️⃣ 采集切换后图片
        with allure.step("步骤三：采集切换后图片"):
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "存测光模式1图")
            img2 = self.image_fetcher.get_latest_image()

            if img2 is None:
                logging.error("❌ 测试失败：获取测光模式1图像失败")
                allure.attach("获取测光模式1图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 4️⃣ 进行图像分析
        with allure.step("步骤四：进行图像分析"):
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 计算亮度直方图
            hist1 = cv2.calcHist([gray1], [0], None, [256], [0, 256])
            hist2 = cv2.calcHist([gray2], [0], None, [256], [0, 256])
            
            # 计算直方图相似度
            correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            
            # 判断是否有明显变化
            has_change = correlation < 0.95  # 阈值可调整

            allure.attach(
                f"直方图相关性: {correlation:.4f}",
                name="分析详情1",
                attachment_type=allure.attachment_type.TEXT
            )

        # 5️⃣ 再次切换并验证
        with allure.step("步骤五：再次切换并验证"):
            # 再次切换测光模式
            self.button_clicker.click_button(METER_X, METER_Y, "再次切换测光模式")
            time.sleep(1)
            
            # 保存新图像
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "存测光模式2图")
            img3 = self.image_fetcher.get_latest_image()
            
            if img3 is None:
                logging.error("❌ 测试失败：获取测光模式2图像失败")
                allure.attach("获取测光模式2图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return
            
            # 分析新图像
            gray3 = cv2.cvtColor(img3, cv2.COLOR_BGR2GRAY)
            hist3 = cv2.calcHist([gray3], [0], None, [256], [0, 256])
            correlation2 = cv2.compareHist(hist2, hist3, cv2.HISTCMP_CORREL)
            
            has_change2 = correlation2 < 0.95  # 阈值可调整

            allure.attach(
                f"第二次切换直方图相关性: {correlation2:.4f}",
                name="分析详情2",
                attachment_type=allure.attachment_type.TEXT
            )

            if has_change and has_change2:
                logging.info("✅ 测试成功：测光模式切换有效")
                allure.attach("测光模式切换有效", name="测试结果", attachment_type=allure.attachment_type.TEXT)
            else:
                logging.error("❌ 测试失败：测光模式切换无效")
                allure.attach("测光模式切换无效", name="错误信息", attachment_type=allure.attachment_type.TEXT)

        logging.info("📌 测光模式测试结束") 