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
PIP_X, PIP_Y = FUNCTIONS["PIP_POP"]["touch"]

@allure.epic("VP180自动化测试")
@allure.feature("图像处理功能")
class Test_PIP_POP(unittest.TestCase):
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

    @allure.feature("画中画功能")
    @allure.story("测试画中画功能是否正确")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.description("""
    测试步骤：
    1. 采集初始图片
    2. 触发画中画功能
    3. 采集画中画图片
    4. 进行图像分析验证
    """)
    def runTest(self):
        """执行测试"""
        if not self.ssh:
            logging.error("SSH 连接未初始化，测试无法执行")
            allure.attach("SSH 连接未初始化", name="错误信息", attachment_type=allure.attachment_type.TEXT)
            return

        logging.info("📌 开始测试画中画功能")
        allure.attach("开始测试画中画功能", name="测试说明", attachment_type=allure.attachment_type.TEXT)

        # 1️⃣ 采集初始图片
        with allure.step("步骤一：采集初始图片"):
            self.button_clicker.click_button(SCREEN_X, SCREEN_Y, "初始存图")
            img1 = self.screenshot_fetcher.get_latest_screenshot()

            if img1 is None:    
                logging.error("❌ 测试失败：获取初始图像失败")
                allure.attach("获取初始图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 2️⃣ 触发画中画功能
        with allure.step("步骤二：触发画中画功能"):
            self.button_clicker.click_button(PIP_X, PIP_Y, "画中画")
            time.sleep(1)

        # 3️⃣ 采集画中画图片
        with allure.step("步骤三：采集画中画图片"):
            self.button_clicker.click_button(SCREEN_X, SCREEN_Y, "存画中画图")
            img2 = self.screenshot_fetcher.get_latest_screenshot()

            if img2 is None:
                logging.error("❌ 测试失败：获取画中画图像失败")
                allure.attach("获取画中画图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 4️⃣ 进行图像分析
        with allure.step("步骤四：进行图像分析"):
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 计算图像差异
            diff = cv2.absdiff(gray1, gray2)
            
            # 计算差异区域的百分比
            total_pixels = diff.shape[0] * diff.shape[1]
            changed_pixels = np.count_nonzero(diff > 30)  # 阈值可调整
            change_percentage = (changed_pixels / total_pixels) * 100
            
            # 判断是否有画中画效果
            has_pip = change_percentage > 5  # 阈值可调整

            allure.attach(
                f"图像变化百分比: {change_percentage:.2f}%",
                name="分析详情",
                attachment_type=allure.attachment_type.TEXT
            )

            if has_pip:
                logging.info("✅ 测试成功：画中画功能已激活")
                allure.attach("画中画功能已激活", name="测试结果", attachment_type=allure.attachment_type.TEXT)
            else:
                logging.error("❌ 测试失败：画中画功能未激活")
                allure.attach("画中画功能未激活", name="错误信息", attachment_type=allure.attachment_type.TEXT)

        # 关闭画中画
        self.button_clicker.click_button(PIP_X, PIP_Y, "关闭画中画")
        logging.info("📌 画中画测试结束") 