# config.py
# 功能坐标配置（屏幕坐标和触摸屏坐标）

# 触摸屏范围
MAX_X = 9599
MAX_Y = 9599
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 600

# 设备路径
INPUT_DEVICE = "/dev/input/event1"
BASE_IMG_DIR = "/ue/ue_harddisk/ue_data"
LOG_PATH = "/app/jzj/log/Log_20250306.txt"
CLICK_LOG_PATH = "/app/jzj/log/click_log.txt"

# 显示器范围 (x, y, width, height)
SCREEN_REGION = (0, 0, 1920, 1080)

# ROI区域定义 (x, y, width, height)
# 1. 312：区域左上角的X坐标（距离显示器左边的像素距离）
# 2. 150：区域左上角的Y坐标（距离显示器顶部的像素距离）
# 3. 400：区域的宽度（像素）
# 4. 300：区域的高度（像素）
ROI_REGIONS = {
    "center": {
        "region": (312, 150, 400, 300),  # 单内镜中间区域
        "description": "单内镜中间区域"
    },
    "center_right": {
        "region": (1512, 150, 400, 300),  # 单内镜缩略图
        "description": "单内镜缩略图"
    },
    "bottom_left": {
        "region": (824, 450, 200, 150),  # 左下角单内镜冻结显示区域
        "description": "左下角单内镜冻结显示区域"
    },
    "full_screen": {
        "region": (0, 0, 1920, 1080),  # 全屏区域
        "description": "整个显示器区域"
    },
    "double_center_left": {
        "region": (312, 150, 400, 300),  # 双内镜中间区域左边
        "description": "双内镜中间区域左边"
    },  
    "double_center_right": {
        "region": (1512, 150, 400, 300),  # 双内镜中间区域右边
        "description": "双内镜中间区域右边"
    },
    "double_bottom_left": {
        "region": (824, 450, 200, 150),  # 双内镜左边内镜缩略图显示区域
        "description": "双内镜左边内镜缩略图显示区域"
    },
    "double_bottom_right": {    
        "region": (1512, 450, 200, 150),  # 双内镜右边内镜缩略图显示区域
        "description": "双内镜右边内镜缩略图显示区域"
    },
    "double_top_left_1": {
        "region": (824, 450, 200, 150),  # 双内镜冻结显示区域左边内镜
        "description": "双内镜冻结显示区域左边内镜"
    },
    "double_top_left_2": {
        "region": (824, 450, 200, 150),  # 双内镜冻结显示区域右边内镜
        "description": "双内镜冻结显示区域右边内镜"
    },
 

}

# 功能坐标 (屏幕坐标 -> 触摸屏坐标)
FUNCTIONS = {
    "MainInterface": {"screen": (45, 160), "touch": (421, 2559), "chinese_name": "主界面"},
    "UserConfig": {"screen": (45, 330), "touch": (421, 5279), "chinese_name": "用户配置"},
    "Settings": {"screen": (45, 510), "touch": (421, 8158), "chinese_name": "设置"},
    "WhiteBalance": {"screen": (200, 250), "touch": (1874, 3999), "chinese_name": "白平衡"},
    "Zoom": {"screen": (400, 250), "touch": (3749, 3999), "chinese_name": "电子放大"},
    "ImageEnhance": {"screen": (600, 250), "touch": (5624, 3999), "chinese_name": "图像增强"},
    "Freeze": {"screen": (800, 210), "touch": (7499, 3359), "chinese_name": "图像冻结"},
    "SaveImage": {"screen": (930, 210), "touch": (8718, 3359), "chinese_name": "保存图像"},
    "Screenshot": {"screen": (800, 380), "touch": (7499, 6078), "chinese_name": "屏幕截图"},
    "Record": {"screen": (930, 380), "touch": (8718, 6078), "chinese_name": "录制"},
    "USBExit": {"screen": (930, 510), "touch": (8718, 8158), "chinese_name": "USB退出"},
    "Export": {"screen": (800, 510), "touch": (7499, 8158), "chinese_name": "导出"},
    "PIP_POP": {"screen": (560, 490), "touch": (5249, 7838), "chinese_name": "画中画"},
    "MeteringMode": {"screen": (250, 490), "touch": (2343, 7838), "chinese_name": "测光模式"},
}

def get_touch_coords(screen_x, screen_y):
    """将屏幕坐标转换为触摸屏坐标"""
    touch_x = int((screen_x / SCREEN_WIDTH) * MAX_X)
    touch_y = int((screen_y / SCREEN_HEIGHT) * MAX_Y)
    return touch_x, touch_y 