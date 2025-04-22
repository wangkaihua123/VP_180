import cv2
import numpy as np
import logging
import os
from skimage.metrics import structural_similarity as ssim
from .log_config import setup_logger

# 获取日志记录器
logger = setup_logger(__name__)
# # 获取 logger 实例
# logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)

# # 设置日志目录
# LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'logs', '@logs')
# os.makedirs(LOG_DIR, exist_ok=True)

# # 创建一个文件处理器，并设置编码为 UTF-8
# file_handler = logging.FileHandler(os.path.join(LOG_DIR, "VP_180.log"), encoding="utf-8")

# # 设置日志格式
# formatter = logging.Formatter(
#     "%(asctime)s - %(levelname)s - %(message)s",
#     datefmt="%Y-%m-%d %H:%M:%S"
# )
# file_handler.setFormatter(formatter)
# logger.addHandler(file_handler)

class ImageComparator:
    @staticmethod
    def is_orb(img1, img2, min_matches=25):
        """使用 ORB 关键点检测判断图像是否放大"""
        logger.info("开始 ORB 关键点检测")
        
        try:
            # 创建 ORB 检测器
            orb = cv2.ORB_create()
            logger.info("创建 ORB 检测器成功")

            # 检测关键点和描述符
            kp1, des1 = orb.detectAndCompute(img1, None)
            kp2, des2 = orb.detectAndCompute(img2, None)
            
            logger.info(f"图像1关键点数量: {len(kp1)}")
            logger.info(f"图像2关键点数量: {len(kp2)}")

            # 检查是否有足够的关键点
            if len(kp1) == 0 or len(kp2) == 0:
                logger.warning("至少一张图片没有检测到关键点，可能是图像质量问题")
                return False

            # 确保描述符不为 None
            if des1 is None or des2 is None:
                logger.warning("无法计算图像描述符")
                return False

            # 创建暴力匹配器
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            
            try:
                matches = bf.match(des1, des2)
                num_matches = len(matches)
                logger.info(f"ORB 匹配点数量: {num_matches}")

                # 判断是否放大
                is_zoomed = num_matches < min_matches
                logger.info(f"图像{'已' if is_zoomed else '未'}放大 (匹配点数量{'<' if is_zoomed else '>='}{min_matches})")
                
                return is_zoomed
            except cv2.error as e:
                logger.error(f"特征匹配失败: {str(e)}")
                # 如果匹配失败，使用关键点数量的变化来判断
                kp_ratio = len(kp2) / len(kp1) if len(kp1) > 0 else 0
                logger.info(f"使用关键点数量比例判断: {kp_ratio:.2f}")
                return kp_ratio < 0.5  # 如果第二张图片的关键点显著减少，认为是放大了

        except Exception as e:
            logger.error(f"ORB 检测过程出错: {str(e)}")
            return False

    @staticmethod
    def is_ssim(img1, img2, threshold=0.98, min_threshold=0.80):
        """使用 SSIM 结构相似性指数判断图像是否放大"""
        try:
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

            # 计算 SSIM
            ssim_index = ssim(gray1, gray2, win_size=3)
            logger.info(f"SSIM 相似度: {ssim_index:.4f}")

            # 判断相似度是否合理
            is_zoomed = min_threshold < ssim_index < threshold
            logger.info(f"图像的相似度{'较' if is_zoomed else '不'}合理,测试 {'通过' if is_zoomed else '不通过'}"
                       f"(SSIM 值: {ssim_index:.4f}, "
                       f"阈值范围: {min_threshold:.2f} - {threshold:.2f})")
            
            return is_zoomed

        except Exception as e:
            logger.error(f"SSIM 计算过程出错: {str(e)}")
            return False
