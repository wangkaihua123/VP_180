import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import unittest
import time
import logging
from vp_180.utils.button_clicker import ButtonClicker
from vp_180.utils.Config import FUNCTIONS
from vp_180.utils.log_config import setup_logger
from vp_180.utils.ssh_manager import SSHManager

# 获取日志记录器
logger = setup_logger(__name__)

class Test_PowerCycle(unittest.TestCase):
    def __init__(self, methodName='runTest'):
        super().__init__(methodName)
        self.ssh = SSHManager.get_client()
        if not self.ssh:
            raise RuntimeError("无法获取SSH连接")
            
        print(f"初始化Test_PowerCycle，SSH连接ID: {id(self.ssh)}")
        print("初始化button_clicker")
        self.button_clicker = ButtonClicker(self.ssh)

    def check_gpio_status(self):
        """检查GPIO状态"""
        try:
            # 先验证 SSH 连接
            if not hasattr(self.ssh, 'exec_command'):
                raise ValueError("SSH连接无效")
                
            # 检查 GPIO 是否已导出
            stdin, stdout, stderr = self.ssh.exec_command('ls /sys/class/gpio/gpio122 2>/dev/null || echo "not_exist"')
            if 'not_exist' in stdout.read().decode():
                # GPIO 未导出，先导出
                self.ssh.exec_command('echo 122 > /sys/class/gpio/export')
                time.sleep(1)
            
            # 读取 GPIO 值
            stdin, stdout, stderr = self.ssh.exec_command('cat /sys/class/gpio/gpio122/value')
            value = stdout.read().decode().strip()
            logging.info(f"GPIO状态: {value}")
            return value
        except Exception as e:
            logging.error(f"检查GPIO状态失败: {str(e)}")
            return None

    def check_screen_status(self):
        """检查屏幕状态"""
        try:
            # 先验证 SSH 连接
            if not hasattr(self.ssh, 'exec_command'):
                raise ValueError("SSH连接无效")
            
            # 使用更可靠的方式检查UI进程
            cmd = 'pgrep -f "secondscreenui" || echo "not_running"'
            stdin, stdout, stderr = self.ssh.exec_command(cmd)
            result = stdout.read().decode().strip()
            
            status = result != "not_running"
            logging.info(f"屏幕状态: {'运行中' if status else '未运行'}")
            return status
        except Exception as e:
            logging.error(f"检查屏幕状态失败: {str(e)}")
            return False

    def runTest(self):
        """执行关机开机测试"""
        try:
            # 1️⃣ 检查初始状态
            logging.info("步骤一：检查初始状态")
            initial_gpio = self.check_gpio_status()
            if initial_gpio is None:
                raise RuntimeError("无法获取GPIO状态")
                
            initial_screen = self.check_screen_status()
            if not initial_screen:
                logging.error("屏幕进程检查失败，尝试等待系统完全启动...")
                time.sleep(10)  # 等待系统完全启动
                initial_screen = self.check_screen_status()
            
            self.assertTrue(initial_screen, "初始状态屏幕未正常运行")

            # 2️⃣ 执行关机操作
            logging.info("步骤二：执行关机操作")
            # 发送关机命令
            stdin, stdout, stderr = self.ssh.exec_command('poweroff')
            time.sleep(5)  # 等待关机操作执行

            # 3️⃣ 验证关机状态
            logging.info("步骤三：验证关机状态")
            power_off_gpio = self.check_gpio_status()
            self.assertEqual(power_off_gpio, "0", "GPIO状态未正确反映关机状态")

            # 4️⃣ 等待设备重启
            logging.info("步骤四：等待设备重启")
            time.sleep(30)  # 等待设备完全重启

            # 5️⃣ 验证开机状态
            logging.info("步骤五：验证开机状态")
            # 重新获取SSH连接
            self.ssh = SSHManager.get_client()
            if not self.ssh:
                raise RuntimeError("重启后无法获取SSH连接")

            # 检查开机后状态
            power_on_gpio = self.check_gpio_status()
            screen_status = self.check_screen_status()

            self.assertEqual(power_on_gpio, "1", "GPIO状态未正确反映开机状态")
            self.assertTrue(screen_status, "屏幕未正常启动")

            logging.info("📌 关机开机测试完成")

        except Exception as e:
            logging.error(f"测试执行过程中出错: {str(e)}")
            self.fail(f"测试执行过程中出错: {str(e)}") 