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
        """
        初始化测试用例执行器
        
        Args:
            ssh_connection: 可选的SSH连接实例，如果为None则自动获取或创建
        """
        # 获取SSH管理器实例
        self.ssh_manager = SSHManager.get_instance()
        
        if ssh_connection:
            # 检查提供的SSH连接是否有效
            if not self._verify_ssh_connection(ssh_connection):
                logger.warning("提供的SSH连接无效，尝试获取新连接")
                ssh_connection = None
        
        if not ssh_connection:
            # 检查现有连接状态
            connection_status = SSHManager.get_connection_status()
            if not connection_status["connected"]:
                logger.warning(f"SSH未连接或连接已断开: {connection_status['last_error']}")
                logger.info("尝试重新建立SSH连接")
                ssh_connection = self.ssh_manager.force_reconnect()
            else:
                # 使用现有的有效连接
                ssh_connection = SSHManager.get_client()
        
        # 如果连接尝试失败，记录日志
        if not ssh_connection:
            logger.error("无法建立SSH连接，测试可能会失败")
        else:
            logger.info("SSH连接就绪，初始化测试组件")
        
        # 保存SSH连接实例
        self.ssh = ssh_connection
        
        # 初始化测试组件
        self.image_getter = GetLatestImage(self.ssh)
        self.screenshot_getter = GetLatestScreenshot(self.ssh)
        self.button_clicker = ButtonClicker(self.ssh)
    
    def _verify_ssh_connection(self, ssh_connection):
        """
        验证SSH连接是否有效
        
        Args:
            ssh_connection: 要验证的SSH连接
            
        Returns:
            bool: 连接是否有效
        """
        if not ssh_connection:
            return False
        
        try:
            # 检查SSH连接的基本属性
            if not hasattr(ssh_connection, 'exec_command'):
                logger.warning("SSH连接对象缺少exec_command方法")
                return False
            
            # 检查传输层
            transport = ssh_connection.get_transport()
            if not transport or not transport.is_active():
                logger.warning("SSH连接的传输层不存在或不活动")
                return False
            
            # 尝试执行简单命令
            stdin, stdout, stderr = ssh_connection.exec_command("echo test", timeout=3)
            output = stdout.read().decode().strip()
            if output != "test":
                logger.warning(f"SSH测试命令响应异常: {output}")
                return False
            
            logger.debug("SSH连接验证成功")
            return True
        except Exception as e:
            logger.error(f"验证SSH连接时出错: {e}")
            return False
        
    def execute_test_case(self, test_case):
        """执行测试用例"""
        try:
            # 首先验证SSH连接
            if not self.ssh or not SSHManager.is_connected():
                logger.warning("SSH连接不活动，尝试重新连接")
                self.ssh = self.ssh_manager.force_reconnect()
                if not self.ssh:
                    logger.error("重新连接SSH失败，无法执行测试用例")
                    return {
                        'success': False,
                        'status': '失败',
                        'message': "SSH连接失败，无法执行测试用例"
                    }
                
                # 更新组件的SSH连接
                self.image_getter.ssh = self.ssh
                self.screenshot_getter.ssh = self.ssh
                self.button_clicker.ssh = self.ssh
            
            # 获取测试用例的顶级id
            test_case_id = test_case.get('id')
            
            # 解析测试用例内容
            if isinstance(test_case['script_content'], str):
                script_content = json.loads(test_case['script_content'])
            else:
                script_content = test_case['script_content']
            logger.info(f"当前执行测试用例名称: {test_case['title']}，测试用例ID: {test_case_id}")

            # 创建一个字典来存储操作步骤的结果，特别是图像数据
            operation_data = {}

            # 执行操作步骤
            operation_results = []
            if 'operationSteps' in script_content:
                for step in script_content['operationSteps']:
                    result = self._execute_operation_step(step, test_case['title'], test_case_id)
                    operation_results.append(result)
                    
                    # 存储关键操作的结果数据，特别是图像和截图
                    step_id = step.get('id')
                    if step_id and result.get('success') and 'data' in result:
                        operation_data[str(step_id)] = result['data']
                        logger.info(f"保存操作步骤 {step_id} 的结果数据")

            # 执行验证步骤
            verification_results = []
            if 'verificationSteps' in script_content:
                logger.info(f"开始执行验证步骤，共 {len(script_content['verificationSteps'])} 个验证步骤")
                for step in script_content['verificationSteps']:
                    logger.info(f"执行验证步骤: {step.get('verification_key', '未知类型')} (ID: {step.get('id', 'n/a')})")
                    # 将操作步骤的结果数据传递给验证步骤
                    result = self._execute_verification_step(step, operation_data)
                    verification_results.append(result)
                    logger.info(f"验证步骤结果: {result.get('success', False)} - {result.get('message', '无消息')}")
                logger.info(f"验证步骤执行完成，结果: {'全部通过' if all(r['success'] for r in verification_results) else '测试不通过'}")
            else:
                logger.warning("测试用例中没有验证步骤")

            # 判断测试结果
            success = all(r['success'] for r in operation_results + verification_results)
            status = '通过' if success else '失败'

            return {
                'success': success,
                'status': status,
                'operation_results': operation_results,
                'verification_results': verification_results
            }

        except Exception as e:
            logger.error(f"执行测试用例时出错: {str(e)}")
            return {
                'success': False,
                'status': '失败',
                'message': f"执行出错: {str(e)}"
            }

    def _execute_operation_step(self, step, test_name, test_case_id=None):
        """执行单个操作步骤"""
        try:
            # 再次检查SSH连接状态
            if not self.ssh or not SSHManager.is_connected():
                logger.warning("操作步骤执行前发现SSH连接不活动，尝试重新连接")
                self.ssh = self.ssh_manager.force_reconnect()
                if not self.ssh:
                    logger.error("重新连接SSH失败，无法执行操作步骤")
                    return {
                        'success': False,
                        'message': "SSH连接失败，无法执行操作步骤"
                    }
                
                # 更新组件的SSH连接
                self.image_getter.ssh = self.ssh
                self.screenshot_getter.ssh = self.ssh
                self.button_clicker.ssh = self.ssh
            
            operation_key = step.get('operation_key', '')
            button_name = step.get('button_name', '')
            x1, y1 = step.get('x1', 0), step.get('y1', 0)
            x2, y2 = step.get('x2', 0), step.get('y2', 0)
            
            if operation_key == '获取图像':
                # 使用 GetLatestImage 获取图像
                self.image_getter.test_name = test_name
                # 将测试用例id参数传递给get_latest_image方法
                image = self.image_getter.get_latest_image(id=test_case_id)
                return {
                    'success': True,
                    'message': f'成功获取图像',
                    'data': {'image': image}
                }
                
            elif operation_key == '获取截图':
                # 使用 GetLatestScreenshot 获取截图
                self.screenshot_getter.test_name = test_name
                # 将测试用例id参数传递给get_latest_screenshot方法
                screenshot = self.screenshot_getter.get_latest_screenshot(id=test_case_id)
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

    def _execute_verification_step(self, step, operation_data):
        """执行单个验证步骤"""
        try:
            verification_key = step.get('verification_key', '')
            
            if verification_key in ['对比图像相似度', '对比图像关键点']:
                img1_ref = step.get('img1', '')
                img2_ref = step.get('img2', '')
                
                # 尝试从操作步骤的结果中获取图像
                img1 = None
                img2 = None
                
                # 首先尝试从操作步骤数据中获取图像
                if img1_ref in operation_data and 'image' in operation_data[img1_ref]:
                    img1 = operation_data[img1_ref]['image']
                    logger.info(f"从操作步骤 {img1_ref} 获取到图像1")
                
                if img2_ref in operation_data and 'image' in operation_data[img2_ref]:
                    img2 = operation_data[img2_ref]['image']
                    logger.info(f"从操作步骤 {img2_ref} 获取到图像2")
                
                # 如果无法从操作步骤数据中获取，尝试从文件路径获取
                if img1 is None and isinstance(img1_ref, str) and os.path.exists(img1_ref):
                    try:
                        img1 = cv2.imread(img1_ref)
                        logger.info(f"从文件路径 {img1_ref} 读取图像1")
                    except Exception as e:
                        logger.warning(f"无法从文件 {img1_ref} 读取图像1: {str(e)}")
                
                if img2 is None and isinstance(img2_ref, str) and os.path.exists(img2_ref):
                    try:
                        img2 = cv2.imread(img2_ref)
                        logger.info(f"从文件路径 {img2_ref} 读取图像2")
                    except Exception as e:
                        logger.warning(f"无法从文件 {img2_ref} 读取图像2: {str(e)}")
                
                # 如果仍然无法获取图像，返回失败
                if img1 is None or img2 is None:
                    logger.error(f"无法获取用于对比的图像: img1={img1_ref}, img2={img2_ref}")
                    return {
                        'success': False,
                        'message': f'无法获取用于对比的图像: img1={img1_ref}, img2={img2_ref}'
                    }
                
                # 根据验证类型调用不同的对比方法
                try:
                    if verification_key == '对比图像相似度':
                        result = ImageComparator.is_ssim(img1, img2)
                        method = 'SSIM相似度'
                    else:  # 对比图像关键点
                        result = ImageComparator.is_orb(img1, img2)
                        method = 'ORB关键点'
                    
                    logger.info(f"图像对比完成 ({method}): 结果: {result}")
                    return {
                        'success': result,
                        'message': f'图像对比完成 ({method}): 结果: {"通过" if result else "不通过"}'
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