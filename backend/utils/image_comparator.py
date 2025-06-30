"""
图像比较模块

该模块提供图像比较和分析功能。主要功能包括：
1. 图像相似度比较
2. 图像特征提取
3. 图像差异分析
4. 支持多种图像格式

主要类：
- ImageComparator: 负责图像比较和分析操作
"""

import cv2
import numpy as np
import logging
import os
# from skimage.metrics import structural_similarity as ssim
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
        """使用 SSIM 结构相似性指数判断图像是否相似"""
        try:
            # 转换为灰度图并转换为float32类型
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY).astype(np.float32)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY).astype(np.float32)

            # 确保两张图片尺寸相同
            if gray1.shape != gray2.shape:
                gray2 = cv2.resize(gray2, (gray1.shape[1], gray1.shape[0]))

            # 归一化图像值到 0-1 范围
            gray1 = gray1 / 255.0
            gray2 = gray2 / 255.0

            # 计算均值
            mu1 = cv2.GaussianBlur(gray1, (11, 11), 1.5)
            mu2 = cv2.GaussianBlur(gray2, (11, 11), 1.5)

            # 计算方差和协方差
            sigma1_sq = cv2.GaussianBlur(gray1 * gray1, (11, 11), 1.5) - mu1 * mu1
            sigma2_sq = cv2.GaussianBlur(gray2 * gray2, (11, 11), 1.5) - mu2 * mu2
            sigma12 = cv2.GaussianBlur(gray1 * gray2, (11, 11), 1.5) - mu1 * mu2

            # SSIM 常数
            C1 = 0.01 ** 2
            C2 = 0.03 ** 2

            # 计算 SSIM
            num = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2)
            den = (mu1 * mu1 + mu2 * mu2 + C1) * (sigma1_sq + sigma2_sq + C2)
            ssim_map = num / den

            # 计算平均 SSIM，确保在 0-1 范围内
            ssim_index = float(np.mean(ssim_map))
            ssim_index = max(0.0, min(1.0, ssim_index))

            logger.info(f"SSIM 相似度: {ssim_index:.4f}")

            # 判断相似度是否达到阈值
            is_similar = ssim_index >= threshold
            logger.info(f"图像相似度{'达到' if is_similar else '未达到'}阈值,测试 {'通过' if is_similar else '不通过'}"
                       f"(SSIM 值: {ssim_index:.4f}, "
                       f"阈值: {threshold:.2f})")
            
            return is_similar

        except Exception as e:
            logger.error(f"SSIM 计算过程出错: {str(e)}")
            return False
            
    @staticmethod
    def histogram_comparison(img1, img2, threshold=0.90):
        """
        使用直方图比较判断两张图像的相似度
        
        参数:
            img1: 第一张图像
            img2: 第二张图像
            threshold: 相似度阈值，默认0.90
            
        返回:
            相似度是否超过阈值
        """
        logger.info("开始进行直方图比较分析")
        
        try:
            # 转换为HSV色彩空间，更适合颜色分析
            hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
            hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
            
            # 计算H通道的直方图
            h_bins = 50
            h_ranges = [0, 180]
            hist1 = cv2.calcHist([hsv1], [0], None, [h_bins], h_ranges)
            hist2 = cv2.calcHist([hsv2], [0], None, [h_bins], h_ranges)
            
            # 归一化直方图
            cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
            cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
            
            # 比较直方图
            similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            logger.info(f"直方图相似度: {similarity:.4f}")
            
            # 判断是否相似
            is_similar = similarity >= threshold
            logger.info(f"图像直方图比较结果: {'相似' if is_similar else '不相似'} "
                        f"(相似度: {similarity:.4f}, 阈值: {threshold:.2f})")
            
            return is_similar
            
        except Exception as e:
            logger.error(f"直方图比较过程出错: {str(e)}")
            return False
    
    @staticmethod
    def color_difference(img1, img2, threshold=30.0):
        """
        通过计算两张图像的平均颜色差异来判断相似度
        
        参数:
            img1: 第一张图像
            img2: 第二张图像
            threshold: 颜色差异阈值，默认30.0（值越小表示越相似）
            
        返回:
            颜色差异是否小于阈值
        """
        logger.info("开始计算颜色差异")
        
        try:
            # 确保两张图像尺寸一致
            if img1.shape != img2.shape:
                h, w = min(img1.shape[0], img2.shape[0]), min(img1.shape[1], img2.shape[1])
                img1 = cv2.resize(img1, (w, h))
                img2 = cv2.resize(img2, (w, h))
                logger.info(f"调整图像尺寸至 {w}x{h}")
            
            # 计算平均颜色差异
            diff = np.abs(img1.astype(np.float32) - img2.astype(np.float32))
            mean_diff = np.mean(diff)
            logger.info(f"平均颜色差异: {mean_diff:.4f}")
            
            # 判断差异是否小于阈值
            is_similar = mean_diff < threshold
            logger.info(f"颜色差异分析结果: {'相似' if is_similar else '不相似'} "
                        f"(差异值: {mean_diff:.4f}, 阈值: {threshold:.2f})")
            
            return is_similar
            
        except Exception as e:
            logger.error(f"颜色差异计算过程出错: {str(e)}")
            return False
    
    @staticmethod
    def template_matching(img1, img2, threshold=0.8):
        """
        使用模板匹配算法判断一幅图像是否包含在另一幅图像中
        
        参数:
            img1: 原始图像
            img2: 要匹配的模板
            threshold: 匹配阈值，默认0.8
            
        返回:
            是否成功匹配
        """
        logger.info("开始模板匹配分析")
        
        try:
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 确保模板小于或等于原始图像
            if gray2.shape[0] > gray1.shape[0] or gray2.shape[1] > gray1.shape[1]:
                # 交换图像，使得模板总是小于原始图像
                gray1, gray2 = gray2, gray1
                logger.info("交换图像顺序以确保模板尺寸小于原始图像")
            
            # 执行模板匹配
            result = cv2.matchTemplate(gray1, gray2, cv2.TM_CCOEFF_NORMED)
            
            # 获取最大匹配值及其位置
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
            logger.info(f"最大匹配值: {max_val:.4f}")
            
            # 判断是否匹配成功
            is_matched = max_val >= threshold
            logger.info(f"模板匹配结果: {'成功' if is_matched else '失败'} "
                        f"(匹配值: {max_val:.4f}, 阈值: {threshold:.2f})")
            
            return is_matched
            
        except Exception as e:
            logger.error(f"模板匹配过程出错: {str(e)}")
            return False

    @staticmethod
    def edge_detection_comparison(img1, img2, threshold=0.60):
        """
        使用边缘检测对比两张图像的边缘特征差异
        
        参数:
            img1: 第一张图像
            img2: 第二张图像
            threshold: 相似度阈值，默认0.60
            
        返回:
            边缘相似度是否超过阈值
        """
        logger.info("开始边缘检测比较")
        
        try:
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 使用Canny边缘检测
            edges1 = cv2.Canny(gray1, 100, 200)
            edges2 = cv2.Canny(gray2, 100, 200)
            
            # 计算边缘图的相似度（使用结构相似性指数）
            # 将边缘图转换为浮点型
            edges1_float = edges1.astype(np.float32)
            edges2_float = edges2.astype(np.float32)
            
            # 计算MSE（均方误差）
            mse = np.mean((edges1_float - edges2_float) ** 2)
            if mse == 0:
                similarity = 1.0
            else:
                # 转换MSE为0-1之间的相似度值
                similarity = 1.0 / (1.0 + mse / 100000)
            
            logger.info(f"边缘检测相似度: {similarity:.4f}")
            
            # 判断是否相似
            is_similar = similarity >= threshold
            logger.info(f"边缘特征比较结果: {'相似' if is_similar else '不相似'} "
                        f"(相似度: {similarity:.4f}, 阈值: {threshold:.2f})")
            
            return is_similar
            
        except Exception as e:
            logger.error(f"边缘检测比较过程出错: {str(e)}")
            return False
    
    @staticmethod
    def brightness_difference(img1, img2, threshold=20.0):
        """
        比较两张图像的亮度差异
        
        参数:
            img1: 第一张图像
            img2: 第二张图像
            threshold: 亮度差异阈值，默认20.0（值越小表示差异越小）
            
        返回:
            亮度差异是否小于阈值
        """
        logger.info("开始计算亮度差异")
        
        try:
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 计算平均亮度
            brightness1 = np.mean(gray1)
            brightness2 = np.mean(gray2)
            
            # 计算亮度差异
            brightness_diff = abs(brightness1 - brightness2)
            logger.info(f"图像1平均亮度: {brightness1:.2f}")
            logger.info(f"图像2平均亮度: {brightness2:.2f}")
            logger.info(f"亮度差异: {brightness_diff:.2f}")
            
            # 判断亮度差异是否小于阈值
            is_similar = brightness_diff < threshold
            logger.info(f"亮度差异分析结果: {'相似' if is_similar else '不相似'} "
                        f"(差异值: {brightness_diff:.2f}, 阈值: {threshold:.2f})")
            
            return is_similar
            
        except Exception as e:
            logger.error(f"亮度差异计算过程出错: {str(e)}")
            return False
    
    @staticmethod
    def contrast_comparison(img1, img2, threshold=0.70):
        """
        比较两张图像的对比度差异
        
        参数:
            img1: 第一张图像
            img2: 第二张图像
            threshold: 相似度阈值，默认0.70
            
        返回:
            对比度相似度是否超过阈值
        """
        logger.info("开始对比度比较分析")
        
        try:
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 计算标准差作为对比度的度量
            contrast1 = np.std(gray1.astype(np.float32))
            contrast2 = np.std(gray2.astype(np.float32))
            
            # 计算对比度相似度
            max_contrast = max(contrast1, contrast2)
            min_contrast = min(contrast1, contrast2)
            
            if max_contrast == 0:
                similarity = 1.0
            else:
                similarity = min_contrast / max_contrast
            
            logger.info(f"图像1对比度: {contrast1:.2f}")
            logger.info(f"图像2对比度: {contrast2:.2f}")
            logger.info(f"对比度相似度: {similarity:.4f}")
            
            # 判断是否相似
            is_similar = similarity >= threshold
            logger.info(f"对比度比较结果: {'相似' if is_similar else '不相似'} "
                        f"(相似度: {similarity:.4f}, 阈值: {threshold:.2f})")
            
            return is_similar
            
        except Exception as e:
            logger.error(f"对比度比较过程出错: {str(e)}")
            return False

    @staticmethod
    def texture_comparison(img1, img2, threshold=0.65):
        """
        使用灰度共生矩阵(GLCM)比较两张图像的纹理特征
        
        参数:
            img1: 第一张图像
            img2: 第二张图像
            threshold: 相似度阈值，默认0.65
            
        返回:
            纹理相似度是否超过阈值
        """
        logger.info("开始纹理特征比较")
        
        try:
            # 转换为灰度图
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            
            # 降低灰度级别以减少计算量
            gray1_reduced = (gray1 // 32).astype(np.uint8)
            gray2_reduced = (gray2 // 32).astype(np.uint8)
            
            # 计算灰度直方图作为简化的纹理特征
            hist1 = cv2.calcHist([gray1_reduced], [0], None, [8], [0, 8])
            hist2 = cv2.calcHist([gray2_reduced], [0], None, [8], [0, 8])
            
            # 归一化直方图
            cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
            cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
            
            # 比较直方图
            similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            logger.info(f"纹理相似度: {similarity:.4f}")
            
            # 判断是否相似
            is_similar = similarity >= threshold
            logger.info(f"纹理特征比较结果: {'相似' if is_similar else '不相似'} "
                        f"(相似度: {similarity:.4f}, 阈值: {threshold:.2f})")
            
            return is_similar
            
        except Exception as e:
            logger.error(f"纹理比较过程出错: {str(e)}")
            return False