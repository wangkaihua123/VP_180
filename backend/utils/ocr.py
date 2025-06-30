import os
import json
import logging
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_image(image_path):
    """
    处理单个图片并返回OCR结果（适配新版PaddleOCR API，修正list结构解析）
    Args:
        image_path (str): 图片路径
    Returns:
        dict: 包含OCR结果的字典
    """
    try:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"找不到文件: {image_path}")

        ocr = PaddleOCR(use_textline_orientation=True, lang="ch")
        image = Image.open(image_path)
        result = ocr.predict(np.array(image))

        text_results = []
        # 修正：新版predict返回list，list[0]为dict
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
            res = result[0]
            texts = res.get('rec_texts', [])
            for text in texts:
                text_results.append(text)
        else:
            logger.warning(f"predict返回非预期结构: {type(result)}，内容: {result}")

        return {
            "image_path": image_path,
            "text_results": text_results,
            "error": None if text_results else "未识别到文本或返回结构异常"
        }
    except Exception as e:
        logger.error(f"处理图片 {image_path} 时出错: {str(e)}")
        return {
            "image_path": image_path,
            "text_results": [],
            "error": str(e)
        }

def process_images(image_paths):
    """
    处理多个图片并返回OCR结果
    Args:
        image_paths (list): 图片路径列表
    Returns:
        dict: 包含所有图片OCR结果的字典
    """
    results = []
    for image_path in image_paths:
        result = process_image(image_path)
        results.append(result)
    return {
        "success": True,
        "data": results,
        "error": None
    }

if __name__ == "__main__":
    # 测试代码
    test_image = "data/img/id_23_screen_capture_20250520_155304.png"
    result = process_images([test_image])
    print(json.dumps(result, ensure_ascii=False, indent=2))
