from .image_comparator import ImageComparator
from .button_clicker import ButtonClicker
from .ssh_manager import SSHManager
from .get_latest_image import GetLatestImage
from .get_latest_screenshot import GetLatestScreenshot
from typing import TypedDict, Dict, List, Union, Optional

class StepMethod(TypedDict):
    description: str
    operation_type: Optional[str]
    verification_type: Optional[str]
    params: List[str]
    default_values: Optional[Dict[str, Union[str, int]]]
    expected_result: Optional[bool]

class StepMethods(TypedDict):
    操作步骤: Dict[str, StepMethod]
    验证步骤: Dict[str, StepMethod]

# 测试步骤方法映射
STEP_METHODS: StepMethods = {
    "操作步骤": {
        "获取图像": {
            "description": "获取最新图像",
            "operation_type": "获取图像",
            "params": [],
            "default_values": {}
        },
        "获取截图": {
            "description": "获取最新截图",
            "operation_type": "获取图像",
            "params": [],
            "default_values": {}
        },
        "点击按钮": {
            "description": "点击指定按钮",
            "operation_type": "点击",
            "params": ["button_name"],
            "default_values": {
                "button_name": ""
            }
        },
        "长按按钮": {
            "description": "长按指定按钮",
            "operation_type": "点击",
            "params": ["button_name"],
            "default_values": {
                "button_name": ""
            }
        },
        "滑动操作": {
            "description": "从一个点滑动到另一个点",
            "operation_type": "滑动",
            "params": ["x1", "y1", "x2", "y2"],
            "default_values": {
                "x1": 0,
                "y1": 0,
                "x2": 0,
                "y2": 0
            }
        }
    },
    "验证步骤": {
        "对比图像相似度": {
            "description": "检查两张图片是否相似",
            "verification_type": "图像验证",
            "params": ["img1", "img2"],
            "expected_result": True
        },
        "对比图像关键点": {
            "description": "检查图像是否存在关键点",
            "verification_type": "图像验证",
            "params": ["img1", "img2"],
            "expected_result": True
        },
        "检查数值范围": {
            "description": "检查数值是否在指定范围内",
            "verification_type": "数值验证",
            "params": ["value", "min_value", "max_value"],
            "expected_result": True
        },
        "检查文本内容": {
            "description": "检查文本是否包含指定内容",
            "verification_type": "文本验证",
            "params": ["text", "expected_text"],
            "expected_result": True
        },
        "检查元素状态": {
            "description": "检查界面元素的状态",
            "verification_type": "界面验证",
            "params": ["element_name", "expected_state"],
            "expected_result": True
        }
    }
}

# 预期结果方法映射（保留向后兼容）
EXPECT_METHODS = STEP_METHODS["验证步骤"] 