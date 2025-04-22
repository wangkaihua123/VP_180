import os

# 获取项目根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 数据目录配置
DATA_DIR = os.path.join(BASE_DIR, 'data')
TEST_CASES_FILE = os.path.join(DATA_DIR, 'test_cases.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
TEST_FILES_DIR = os.path.join(DATA_DIR, 'test_files')
SCREENSHOTS_DIR = os.path.join(DATA_DIR, 'screenshots')
IMAGES_DIR = os.path.join(DATA_DIR, 'img')

# Web服务配置
WEB_TEMPLATES_DIR = os.path.join(BASE_DIR, 'server', 'templates')
WEB_STATIC_DIR = os.path.join(BASE_DIR, 'server', 'static')
WEB_STATIC_URL = '/static'

# 日志配置
LOG_DIR = os.path.join(BASE_DIR, 'data', 'logs')
LOG_LEVEL = 'DEBUG'

# 测试配置
TEST_DIR = os.path.join(BASE_DIR, 'tests')
REPORTS_DIR = os.path.join(BASE_DIR, 'reports')

# 确保必要的目录存在
def ensure_directories():
    """确保所有必要的目录都存在"""
    directories = [
        DATA_DIR,
        TEST_FILES_DIR,
        SCREENSHOTS_DIR,
        IMAGES_DIR,
        LOG_DIR,
        TEST_DIR,
        REPORTS_DIR,
        WEB_TEMPLATES_DIR,
        WEB_STATIC_DIR
    ]
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory) 