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
WB_X, WB_Y = FUNCTIONS["WhiteBalance"]["touch"]

@allure.epic("VP180自动化测试")
@allure.feature("图像处理功能")
class Test_WhiteBalance(unittest.TestCase):
    def __init__(self, ssh_connection, methodName='runTest'):
        super().__init__(methodName)
        if isinstance(ssh_connection, str):
            # 如果是字符串，说明是从环境变量传递的ID，需要重新获取SSH连接
            self.ssh = SSHManager.connect_ssh()
        else:
            self.ssh = ssh_connection
        self.image_fetcher = GetLatestImage(self.ssh, test_name=self.__class__.__name__)
        self.button_clicker = ButtonClicker(self.ssh)

    @allure.feature("白平衡功能")
    @allure.story("测试白平衡调节后是否正确存图")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.description("""
    测试步骤：
    1. 采集初始图片
    2. 触发白平衡调节
    3. 采集调节后图片
    4. 进行图像比对验证
    """)
    def runTest(self):
        """执行测试"""
        if not self.ssh:
            logging.error("SSH 连接未初始化，测试无法执行")
            allure.attach("SSH 连接未初始化", name="错误信息", attachment_type=allure.attachment_type.TEXT)
            return

        logging.info("📌 开始测试白平衡功能")
        allure.attach("开始测试白平衡功能", name="测试说明", attachment_type=allure.attachment_type.TEXT)

        # 1️⃣ 采集初始图片
        with allure.step("步骤一：采集初始图片"):
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "初始存图")
            img1 = self.image_fetcher.get_latest_image()

            if img1 is None:    
                logging.error("❌ 测试失败：获取初始图像失败")
                allure.attach("获取初始图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 2️⃣ 触发白平衡调节
        with allure.step("步骤二：触发白平衡调节"):
            self.button_clicker.click_button(WB_X, WB_Y, "白平衡")
            time.sleep(1)

        # 3️⃣ 采集调节后图片
        with allure.step("步骤三：采集调节后图片"):
            self.button_clicker.click_button(SAVE_X, SAVE_Y, "存白平衡调节后图")
            img2 = self.image_fetcher.get_latest_image()

            if img2 is None:
                logging.error("❌ 测试失败：获取白平衡调节后图像失败")
                allure.attach("获取白平衡调节后图像失败", name="错误信息", attachment_type=allure.attachment_type.TEXT)
                return

        # 4️⃣ 进行图像比对
        with allure.step("步骤四：进行图像比对"):
            # 计算两张图片的平均颜色值
            avg_color1 = np.mean(img1, axis=(0, 1))
            avg_color2 = np.mean(img2, axis=(0, 1))
            
            # 计算颜色变化
            color_diff = np.abs(avg_color2 - avg_color1)
            
            # 判断是否有显著的颜色变化
            has_color_change = np.any(color_diff > 5)  # 阈值可以根据需要调整

            allure.attach(
                f"平均颜色变化: {color_diff}\n颜色是否显著变化: {has_color_change}",
                name="比对详情",
                attachment_type=allure.attachment_type.TEXT
            )

            if has_color_change:
                logging.info("✅ 测试成功：白平衡已调节")
                allure.attach("白平衡已调节", name="测试结果", attachment_type=allure.attachment_type.TEXT)
            else:
                logging.error("❌ 测试失败：白平衡未调节")
                allure.attach("白平衡未调节", name="错误信息", attachment_type=allure.attachment_type.TEXT)

        logging.info("📌 白平衡测试结束") 