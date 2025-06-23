"""
应用程序配置模块 - 集中管理配置参数
"""
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 基础配置
SECRET_KEY = os.getenv('SECRET_KEY', 'youyi_medical_test_platform_secret_key')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

# IP配置
USE_FIXED_IP = os.getenv('USE_FIXED_IP', 'true').lower() in ('true', '1', 't')
FIXED_HOST = os.getenv('FIXED_HOST', '0.0.0.0')
FIXED_PORT = int(os.getenv('FIXED_PORT', 5000))

# 动态获取主机IP
def get_host():
    if USE_FIXED_IP:
        return FIXED_HOST
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        host = s.getsockname()[0]
        s.close()
        return host
    except:
        return '0.0.0.0'

HOST = get_host()
PORT = FIXED_PORT

# 数据目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
TEST_CASES_FILE = os.path.join(DATA_DIR, 'test_cases.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
LOGS_DIR = os.path.join(DATA_DIR, 'logs')

# 文件存储目录
IMAGES_DIR = os.path.join(DATA_DIR, 'img')
SCREENSHOTS_DIR = os.path.join(DATA_DIR, 'screenshots')

# 确保必要的目录存在
for directory in (DATA_DIR, LOGS_DIR, IMAGES_DIR, SCREENSHOTS_DIR):
    os.makedirs(directory, exist_ok=True)

# 默认数据库配置
DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///' + os.path.join(DATA_DIR, 'app.db'))

# 日志配置
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# SSH相关配置
SSH_TIMEOUT = int(os.getenv('SSH_TIMEOUT', 10))

# 串口相关配置
SERIAL_TIMEOUT = int(os.getenv('SERIAL_TIMEOUT', 1))

# 基本路径配置
ROOT_DIR = os.path.dirname(BASE_DIR)

# 测试用例配置
TEST_CASES_DIR = os.path.join(DATA_DIR, 'test_cases')
os.makedirs(TEST_CASES_DIR, exist_ok=True)

# 测试用例日志目录 - 已移除
# TEST_CASE_LOGS_DIR = os.path.join(LOGS_DIR, 'logs')
# os.makedirs(TEST_CASE_LOGS_DIR, exist_ok=True)

# SSH默认配置
DEFAULT_SSH_CONFIG = {
    "sshHost": "", 
    "sshPort": 22, 
    "sshUsername": "", 
    "sshPassword": ""
}

# 串口默认配置
DEFAULT_SERIAL_CONFIG = {
    "serialPort": "",
    "serialBaudRate": "9600"
}

# 默认测试用例
DEFAULT_TEST_CASE = {
    'id': 1,
    'title': '登录界面测试',
    'type': '功能测试',
    'status': '未运行',
    'description': '测试登录界面的表单验证和提交功能',
    'last_execution_time': '',
    'script_content': '{"repeatCount": 1, "operationSteps": [{"id": 1, "operation_key": "获取图像", "button_name": "", "x1": 0, "y1": 0, "x2": 0, "y2": 0}], "verificationSteps": [{"id": 1, "verification_key": "对比图像相似度", "img1": "1", "img2": "1"}]}'
} 