import json
import os
import cv2
from datetime import datetime
from .get_latest_image import GetLatestImage
from .get_latest_screenshot import GetLatestScreenshot
from .button_clicker import ButtonClicker
from .ssh_manager import SSHManager
from .image_comparator import ImageComparator
from .log_config import setup_logger

logger = setup_logger(__name__)

class TestCaseExecutor:
    def __init__(self, ssh_connection=None):
        """初始化测试用例执行器"""
        self.ssh = ssh_connection or SSHManager().connect()
        self.image_getter = GetLatestImage(self.ssh)
        self.screenshot_getter = GetLatestScreenshot(self.ssh)
        self.button_clicker = ButtonClicker(self.ssh)
        
    def execute_test_case(self, test_case):
        """执行测试用例"""
        try:
            # 解析测试用例内容
            if isinstance(test_case['script_content'], str):
                script_content = json.loads(test_case['script_content'])
            else:
                script_content = test_case['script_content']

            # 创建日志目录
            log_dir = os.path.join('data', 'logs', '@logs', str(test_case['id']))
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

            # 执行操作步骤
            operation_results = []
            if 'operationSteps' in script_content:
                for step in script_content['operationSteps']:
                    result = self._execute_operation_step(step, test_case['title'])
                    operation_results.append(result)
                    # 记录日志
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"操作步骤 {step['id']}: {result['message']}\n")

            # 执行验证步骤
            verification_results = []
            if 'verificationSteps' in script_content:
                for step in script_content['verificationSteps']:
                    result = self._execute_verification_step(step)
                    verification_results.append(result)
                    # 记录日志
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"验证步骤 {step['id']}: {result['message']}\n")

            # 判断测试结果
            success = all(r['success'] for r in operation_results + verification_results)
            status = '通过' if success else '失败'

            return {
                'success': success,
                'status': status,
                'operation_results': operation_results,
                'verification_results': verification_results,
                'log_file': log_file
            }

        except Exception as e:
            logger.error(f"执行测试用例时出错: {str(e)}")
            return {
                'success': False,
                'status': '失败',
                'message': f"执行出错: {str(e)}"
            }

    def _execute_operation_step(self, step, test_name):
        """执行单个操作步骤"""
        try:
            operation_key = step.get('operation_key', '')
            button_name = step.get('button_name', '')
            x1, y1 = step.get('x1', 0), step.get('y1', 0)
            x2, y2 = step.get('x2', 0), step.get('y2', 0)
            
            if operation_key == '获取图像':
                # 使用 GetLatestImage 获取图像
                self.image_getter.test_name = test_name
                image = self.image_getter.get_latest_image()
                return {
                    'success': True,
                    'message': f'成功获取图像',
                    'data': {'image': image}
                }
                
            elif operation_key == '获取截图':
                # 使用 GetLatestScreenshot 获取截图
                self.screenshot_getter.test_name = test_name
                screenshot = self.screenshot_getter.get_latest_screenshot()
                return {
                    'success': True,
                    'message': f'成功获取截图',
                    'data': {'screenshot': screenshot}
                }
                
            elif operation_key == '点击按钮':
                # 使用 ButtonClicker 的 click_button 方法
                success = self.button_clicker.click_button(
                    x=x1, y=y1,
                    button_name=button_name,
                    description=button_name or f'坐标({x1},{y1})'
                )
                return {
                    'success': success,
                    'message': f'点击按钮: {button_name or f"坐标({x1},{y1})"}'
                }
                
            elif operation_key == '长按按钮':
                # 使用 ButtonClicker 的 long_click 方法
                success = self.button_clicker.long_click(
                    x=x1, y=y1,
                    description=button_name or f'坐标({x1},{y1})'
                )
                return {
                    'success': success,
                    'message': f'长按按钮: {button_name or f"坐标({x1},{y1})"}'
                }
                
            elif operation_key == '滑动操作':
                # 使用 ButtonClicker 的 slide 方法
                success = self.button_clicker.slide(
                    x1=x1, y1=y1,
                    x2=x2, y2=y2,
                    description=f'从({x1},{y1})滑动到({x2},{y2})'
                )
                return {
                    'success': success,
                    'message': f'执行滑动: ({x1},{y1}) -> ({x2},{y2})'
                }
                
            else:
                return {
                    'success': False,
                    'message': f'未知的操作类型: {operation_key}'
                }

        except Exception as e:
            logger.error(f"执行操作步骤时出错: {str(e)}")
            return {
                'success': False,
                'message': f"操作执行出错: {str(e)}"
            }

    def _execute_verification_step(self, step):
        """执行单个验证步骤"""
        try:
            verification_key = step.get('verification_key', '')
            
            if verification_key in ['对比图像相似度', '对比图像关键点']:
                img1_path = step.get('img1', '')
                img2_path = step.get('img2', '')
                
                # 检查图像文件是否存在
                if not os.path.exists(img1_path) or not os.path.exists(img2_path):
                    return {
                        'success': False,
                        'message': f'图像文件不存在: {img1_path} 或 {img2_path}'
                    }
                
                try:
                    # 读取图像
                    img1 = cv2.imread(img1_path)
                    img2 = cv2.imread(img2_path)
                    
                    if img1 is None or img2 is None:
                        return {
                            'success': False,
                            'message': f'无法读取图像文件: {img1_path} 或 {img2_path}'
                        }
                    
                    # 根据验证类型调用不同的对比方法
                    if verification_key == '对比图像相似度':
                        result = ImageComparator.is_ssim(img1, img2)
                        method = 'SSIM相似度'
                    else:  # 对比图像关键点
                        result = ImageComparator.is_orb(img1, img2)
                        method = 'ORB关键点'
                    
                    return {
                        'success': result,
                        'message': f'图像对比完成 ({method}): {img1_path} vs {img2_path}, 结果: {"通过" if result else "不通过"}'
                    }
                    
                except Exception as e:
                    logger.error(f"图像对比过程出错: {str(e)}")
                    return {
                        'success': False,
                        'message': f'图像对比出错: {str(e)}'
                    }
                
            elif verification_key == '检查数值范围':
                # TODO: 实现数值范围检查逻辑
                value = float(step.get('value', 0))
                min_value = float(step.get('min_value', 0))
                max_value = float(step.get('max_value', 0))
                return {
                    'success': min_value <= value <= max_value,
                    'message': f'数值 {value} 在范围 [{min_value}, {max_value}] 内'
                }
                
            else:
                return {
                    'success': False,
                    'message': f'未知的验证类型: {verification_key}'
                }

        except Exception as e:
            logger.error(f"执行验证步骤时出错: {str(e)}")
            return {
                'success': False,
                'message': f"验证执行出错: {str(e)}"
            } 