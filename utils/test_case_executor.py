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
from backend.models.settings import Settings

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
        # else:
        #     logger.info("SSH连接就绪，初始化测试组件")
        
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
            
            # logger.debug("SSH连接验证成功")
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
            
            # 获取重复次数，默认为1
            repeat_count = int(script_content.get('repeatCount', 1))
            # 确保重复次数至少为1
            repeat_count = max(1, repeat_count)
            
            logger.info(f"当前执行测试用例名称: {test_case['title']}，测试用例ID: {test_case_id}，重复次数: {repeat_count}")
            
            # 存储所有执行结果
            all_operation_results = []
            all_verification_results = []
            overall_success = True
            
            # 根据重复次数执行测试用例
            for run_index in range(repeat_count):
                logger.info(f"执行第 {run_index + 1}/{repeat_count} 次测试")
                
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
                    logger.info(f"验证步骤执行完成，结果: {'测试通过' if all(r['success'] for r in verification_results) else '测试不通过'}")
                else:
                    logger.warning("测试用例中没有验证步骤")

                # 判断当前执行的测试结果
                current_success = all(r['success'] for r in operation_results + verification_results)
                if not current_success:
                    overall_success = False
                
                # 收集当前执行的结果
                all_operation_results.extend(operation_results)
                all_verification_results.extend(verification_results)
                
                # 如果当前测试失败并且不是最后一次执行，记录日志
                if not current_success and run_index < repeat_count - 1:
                    logger.warning(f"第 {run_index + 1} 次测试执行失败，继续执行剩余的测试")
            
            # 全部执行完成后的状态
            status = '通过' if overall_success else '失败'
            logger.info(f"测试用例 {test_case['title']} 执行完成，共执行 {repeat_count} 次，最终状态: {status}")

            return {
                'success': overall_success,
                'status': status,
                'operation_results': all_operation_results,
                'verification_results': all_verification_results,
                'repeat_count': repeat_count
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
                
            elif operation_key == '随机点击':
                # 使用 ButtonClicker 的 random_click 方法
                success = self.button_clicker.random_click()
                return {
                    'success': success,
                    'message': f'执行随机点击'
                }
                
            elif operation_key == '单点随机点击':
                # 使用 ButtonClicker 的 single_random_click 方法
                success = self.button_clicker.single_random_click()
                return {
                    'success': success,
                    'message': f'执行单点随机点击'
                }
                
            elif operation_key == '双点随机点击':
                # 使用 ButtonClicker 的 double_random_click 方法
                success = self.button_clicker.double_random_click()
                return {
                    'success': success,
                    'message': f'执行双点随机点击'
                }
                
            elif operation_key == '三点随机点击':
                # 使用 ButtonClicker 的 triple_random_click 方法
                success = self.button_clicker.triple_random_click()
                return {
                    'success': success,
                    'message': f'执行三点随机点击'
                }
                
            elif operation_key == '等待时间':
                # 获取等待时间，单位为毫秒
                wait_time_ms = step.get('waitTimeMs', 1000)
                # 转换为秒
                wait_time_sec = wait_time_ms / 1000.0
                
                import time
                logger.info(f'等待 {wait_time_ms} 毫秒 ({wait_time_sec:.2f} 秒)')
                # 执行等待
                time.sleep(wait_time_sec)
                
                return {
                    'success': True,
                    'message': f'等待时间完成: {wait_time_ms} 毫秒'
                }
                
            elif operation_key == '串口开机':
                # 导入SerialManager
                from .serial_manager import SerialManager
                
                # 记录日志
                logger.info('准备发送串口开机命令')
                
                try:
                    # 获取SerialManager实例
                    serial_settings = Settings.get_serial_settings()
                    serial_manager = SerialManager.get_instance(serial_settings['serialPort'], serial_settings['serialBaudRate'])
                    
                    # 检查串口是否已连接
                    if not SerialManager.is_connected():
                        logger.info('串口未连接，尝试连接串口...')
                        serial_client = serial_manager.connect()
                        if not serial_client:
                            logger.error('串口连接失败，无法执行串口开机操作')
                            return {
                                'success': False,
                                'message': '串口连接失败，无法执行串口开机操作'
                            }
                        logger.info('串口连接成功，继续执行串口开机操作')
                    else:
                        logger.info('串口已连接，继续执行串口开机操作')
                    
                    # 发送开机命令 fefe0501 (十六进制)
                    # 将十六进制字符串转换为二进制数据
                    command = bytes.fromhex('fefe0501')
                    success = serial_manager.write(command)
                    
                    if success:
                        logger.info('串口开机命令发送成功')
                    else:
                        logger.error('串口开机命令发送失败')
                    
                    return {
                        'success': success,
                        'message': '发送串口开机命令' + (' 成功' if success else ' 失败')
                    }
                except Exception as e:
                    logger.error(f'发送串口开机命令时出错: {str(e)}')
                    return {
                        'success': False,
                        'message': f'发送串口开机命令失败: {str(e)}'
                    }
                
            elif operation_key == '串口关机':
                # 导入SerialManager
                from .serial_manager import SerialManager
                
                # 记录日志
                logger.info('准备发送串口关机命令')
                
                try:
                    # 获取SerialManager实例
                    serial_settings = Settings.get_serial_settings()
                    serial_manager = SerialManager.get_instance(serial_settings['serialPort'], serial_settings['serialBaudRate'])
                    
                    # 检查串口是否已连接
                    if not SerialManager.is_connected():
                        logger.info('串口未连接，尝试连接串口...')
                        serial_client = serial_manager.connect()
                        if not serial_client:
                            logger.error('串口连接失败，无法执行串口关机操作')
                            return {
                                'success': False,
                                'message': '串口连接失败，无法执行串口关机操作'
                            }
                        logger.info('串口连接成功，继续执行串口关机操作')
                    else:
                        logger.info('串口已连接，继续执行串口关机操作')
                    
                    # 发送关机命令 fefe0500 (十六进制)
                    # 将十六进制字符串转换为二进制数据
                    command = bytes.fromhex('fefe0500')
                    success = serial_manager.write(command)
                    
                    if success:
                        logger.info('串口关机命令发送成功')
                    else:
                        logger.error('串口关机命令发送失败')
                    
                    return {
                        'success': success,
                        'message': '发送串口关机命令' + (' 成功' if success else ' 失败')
                    }
                except Exception as e:
                    logger.error(f'发送串口关机命令时出错: {str(e)}')
                    return {
                        'success': False,
                        'message': f'发送串口关机命令失败: {str(e)}'
                    }
                
            elif operation_key == '串口关-开机':
                # 导入SerialManager
                from .serial_manager import SerialManager
                import time
                
                # 记录日志
                logger.info('准备执行串口关-开机操作')
                
                try:
                    # 获取SerialManager实例
                    serial_settings = Settings.get_serial_settings()
                    serial_manager = SerialManager.get_instance(serial_settings['serialPort'], serial_settings['serialBaudRate'])
                    
                    # 检查串口是否已连接
                    if not SerialManager.is_connected():
                        logger.info('串口未连接，尝试连接串口...')
                        serial_client = serial_manager.connect()
                        if not serial_client:
                            logger.error('串口连接失败，无法执行串口关-开机操作')
                            return {
                                'success': False,
                                'message': '串口连接失败，无法执行串口关-开机操作'
                            }
                        logger.info('串口连接成功，继续执行串口关-开机操作')
                    else:
                        logger.info('串口已连接，继续执行串口关-开机操作')
                    
                    # 1. 发送关机命令
                    logger.info('发送关机命令...')
                    command = bytes.fromhex('fefe0500')
                    success = serial_manager.write(command)
                    
                    if not success:
                        logger.error('串口关机命令发送失败')
                        return {
                            'success': False,
                            'message': '串口关机命令发送失败'
                        }
                    
                    # 2. 等待指定时间
                    wait_time = step.get('waitTime', 1000) / 1000.0  # 转换为秒
                    logger.info(f'等待 {wait_time} 秒...')
                    time.sleep(wait_time)
                    
                    # 3. 发送开机命令
                    logger.info('发送开机命令...')
                    command = bytes.fromhex('fefe0501')
                    success = serial_manager.write(command)
                    
                    if success:
                        logger.info('串口关-开机操作执行成功')
                    else:
                        logger.error('串口开机命令发送失败')
                    
                    return {
                        'success': success,
                        'message': '串口关-开机操作' + (' 成功' if success else ' 失败')
                    }
                except Exception as e:
                    logger.error(f'执行串口关-开机操作时出错: {str(e)}')
                    return {
                        'success': False,
                        'message': f'串口关-开机操作失败: {str(e)}'
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