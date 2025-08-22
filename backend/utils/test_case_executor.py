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
from models.settings import Settings

logger = setup_logger(__name__)

class TestCaseExecutor:
    # 默认操作步骤间隔时间（秒）
    DEFAULT_OPERATION_INTERVAL = 0.6
    
    def __init__(self, ssh_connection=None):
        """
        初始化测试用例执行器
        
        Args:
            ssh_connection: 可选的SSH连接实例，如果为None则自动获取或创建
        """
        # 操作步骤间隔时间（秒）
        self.operation_interval = self.DEFAULT_OPERATION_INTERVAL
        
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

            # 如果传输层活动，我们认为连接是有效的
            # 不再执行测试命令，避免因为通道问题导致误判
            logger.debug("SSH连接验证成功（基于传输层状态）")
            return True

        except Exception as e:
            logger.error(f"验证SSH连接时出错: {e}")
            return False
    
    def find_matching_file(self, directory, keyword):
        """
        在指定目录中查找文件名包含关键字的最新文件
        
        Args:
            directory (str): 要搜索的目录路径
            keyword (str): 要匹配的关键字
            
        Returns:
            str: 匹配文件的完整路径，如果没有找到则返回None
        """
        if not os.path.exists(directory):
            logger.warning(f"目录不存在: {directory}")
            return None
            
        try:
            # 获取目录中所有文件
            all_files = os.listdir(directory)
            
            # 筛选出包含关键字的文件
            matching_files = [f for f in all_files if keyword in f]
            
            if not matching_files:
                logger.debug(f"在目录 {directory} 中没有找到包含 {keyword} 的文件")
                return None
                
            # 按文件名排序（通常包含时间戳的文件名按时间排序）
            matching_files.sort(reverse=True)
            
            # 返回排序后的第一个（最新的）文件的完整路径
            latest_file = matching_files[0]
            logger.info(f"找到匹配的文件: {latest_file}")
            
            return os.path.join(directory, latest_file)
            
        except Exception as e:
            logger.error(f"查找匹配文件时出错: {str(e)}")
            return None
        
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

                # 分离普通操作步骤和清理操作步骤
                normal_operation_steps = []
                cleanup_operation_steps = []
                if 'operationSteps' in script_content:
                    for step in script_content['operationSteps']:
                        # 默认步骤类型为test-case
                        step_type = step.get('stepType', 'test-case')
                        if step_type == 'cleanup-environment':
                            cleanup_operation_steps.append(step)
                        else:
                            normal_operation_steps.append(step)

                # 保持用户在前端设置的步骤顺序，不进行重新排序
                # 用户在前端界面中已经通过拖拽等方式设置了步骤的执行顺序
                # 这个顺序已经保存在数组中，应该按照这个顺序执行

                # 执行普通操作步骤
                current_operation_results = []
                logger.info(f"开始执行普通操作步骤，共 {len(normal_operation_steps)} 个步骤")
                for step in normal_operation_steps:
                    # 打印当前执行的步骤信息
                    step_name = step.get('operation_key', '未知操作')
                    step_id = step.get('id', 'n/a')
                    logger.info(f"当前执行步骤：{step_name} (ID: {step_id})")

                    result = self._execute_operation_step(step, test_case['title'], test_case_id)
                    current_operation_results.append(result)
                    
                    # 存储关键操作的结果数据，特别是图像和截图
                    step_id = step.get('id')
                    if step_id and result.get('success') and 'data' in result:
                        operation_data[str(step_id)] = result['data']
                        logger.info(f"保存操作步骤 {step_id} 的结果数据")
                    
                    # 在操作步骤之间添加等待时间
                    if self.operation_interval > 0:
                        import time
                        logger.debug(f"等待操作步骤间隔时间: {self.operation_interval}秒")
                        time.sleep(self.operation_interval)

                # 执行验证步骤
                current_verification_results = []
                if 'verificationSteps' in script_content:
                    # 保持用户在前端设置的验证步骤顺序，不进行重新排序
                    verification_steps = script_content['verificationSteps']
                    logger.info(f"开始执行验证步骤，共 {len(verification_steps)} 个验证步骤")
                    for step in verification_steps:
                        # 打印当前执行的步骤信息
                        step_name = step.get('verification_key', '未知验证')
                        step_id = step.get('id', 'n/a')
                        logger.info(f"当前执行步骤：{step_name} (ID: {step_id})")

                        # 将操作步骤的结果数据传递给验证步骤
                        result = self._execute_verification_step(step, operation_data)
                        current_verification_results.append(result)
                        logger.info(f"验证步骤结果: {result.get('success', False)} - {result.get('message', '无消息')}")
                    logger.info(f"验证步骤执行完成，结果: {'测试通过' if all(r['success'] for r in current_verification_results) else '测试不通过'}")
                else:
                    logger.warning("测试用例中没有验证步骤")

                # 执行清理操作步骤
                current_cleanup_results = []
                logger.info(f"开始执行清理操作步骤，共 {len(cleanup_operation_steps)} 个步骤")
                for step in cleanup_operation_steps:
                    # 打印当前执行的步骤信息
                    step_name = step.get('operation_key', '未知清理操作')
                    step_id = step.get('id', 'n/a')
                    logger.info(f"当前执行步骤：{step_name} (ID: {step_id})")

                     # 在清理步骤之间添加等待时间
                    if self.operation_interval > 0:
                        import time
                        logger.debug(f"等待操作步骤间隔时间: {self.operation_interval}秒")
                        time.sleep(self.operation_interval)

                    result = self._execute_operation_step(step, test_case['title'], test_case_id) # 清理步骤也是操作步骤，复用执行函数
                    current_cleanup_results.append(result)

                # 判断当前执行的测试结果
                # 总体成功需要所有普通操作、验证步骤和清理操作都成功
                current_success = all(r['success'] for r in current_operation_results + current_verification_results + current_cleanup_results)

                if not current_success:
                    overall_success = False
                
                # 收集当前执行的结果
                all_operation_results.extend(current_operation_results + current_cleanup_results) # 将清理操作结果添加到总操作结果中
                all_verification_results.extend(current_verification_results)
                
                # 如果当前测试失败并且不是最后一次执行，记录日志
                if not current_success and run_index < repeat_count - 1:
                    logger.warning(f"第 {run_index + 1} 次测试执行失败，继续执行剩余的测试")
            
            # 全部执行完成后的状态
            status = '通过' if overall_success else '失败'
            logger.info(f"测试用例 {test_case['title']} 执行完成，共执行 {repeat_count} 次，最终状态: {status}")

            # 清理所有结果中的不可序列化对象，避免JSON序列化错误
            def clean_for_json(obj):
                """递归清理对象，移除不可序列化的内容"""
                import numpy as np

                if isinstance(obj, dict):
                    cleaned = {}
                    for k, v in obj.items():
                        if k == 'data':  # 跳过data字段，因为它可能包含numpy数组
                            continue
                        cleaned[k] = clean_for_json(v)
                    return cleaned
                elif isinstance(obj, list):
                    return [clean_for_json(item) for item in obj]
                elif isinstance(obj, np.ndarray):
                    return None  # 移除numpy数组
                elif hasattr(obj, '__dict__'):
                    return str(obj)  # 将复杂对象转换为字符串
                else:
                    return obj

            cleaned_operation_results = clean_for_json(all_operation_results)
            cleaned_verification_results = clean_for_json(all_verification_results)

            return {
                'success': overall_success,
                'status': status,
                'operation_results': cleaned_operation_results,
                'verification_results': cleaned_verification_results,
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
                    'data': {'image': image}  # 内部使用，不会被序列化
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
            elif operation_key == '获取操作界面':
                # 使用 GetLatestImage 获取操作界面
                self.screenshot_getter.test_name = test_name
                # 将测试用例id参数传递给get_latest_screenshot方法
                image = self.image_getter.get_screen_capture(id=test_case_id)
                return {
                    'success': True,
                    'message': f'成功获取操作界面',
                    'data': {'image': image}
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
                    button_name=button_name,
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
                
            elif operation_key == '可视化录制':
                # 导入RunMonitor
                from .run_monitor import RunMonitor
                
                # 获取录制的步骤
                recorded_steps = step.get('recorded_steps', [])
                if not recorded_steps:
                    logger.warning("可视化录制步骤为空")
                    return {
                        'success': False,
                        'message': '可视化录制步骤为空'
                    }
                
                # 创建RunMonitor实例并执行录制的步骤
                run_monitor = RunMonitor(self.ssh)
                result = run_monitor.execute_recorded_steps(recorded_steps)
                
                return {
                    'success': result['success'],
                    'message': result['message'],
                    'details': result.get('details', [])
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
                elif img1_ref in operation_data and 'screenshot' in operation_data[img1_ref]:
                    img1 = operation_data[img1_ref]['screenshot']
                    logger.info(f"从操作步骤 {img1_ref} 获取到截图1")
                
                if img2_ref in operation_data and 'image' in operation_data[img2_ref]:
                    img2 = operation_data[img2_ref]['image']
                    logger.info(f"从操作步骤 {img2_ref} 获取到图像2")
                elif img2_ref in operation_data and 'screenshot' in operation_data[img2_ref]:
                    img2 = operation_data[img2_ref]['screenshot']
                    logger.info(f"从操作步骤 {img2_ref} 获取到截图2")
                
                # 如果无法从操作步骤数据中获取，尝试从文件路径获取
                if img1 is None:
                    # 尝试在screenshot目录中查找对应的截图
                    screenshot_dir = os.path.join('data', 'screenshots')
                    if os.path.exists(screenshot_dir):
                        # 获取最新的匹配文件
                        matching_files = [f for f in os.listdir(screenshot_dir) if f.startswith(f'id_{img1_ref}_')]
                        if matching_files:
                            latest_file = max(matching_files)  # 获取最新的文件
                            img_path = os.path.join(screenshot_dir, latest_file)
                            try:
                                img1 = cv2.imread(img_path)
                                logger.info(f"从截图目录读取图像1: {img_path}")
                            except Exception as e:
                                logger.warning(f"无法从文件 {img_path} 读取图像1: {str(e)}")
                
                if img2 is None:
                    # 尝试在screenshot目录中查找对应的截图
                    screenshot_dir = os.path.join('data', 'screenshots')
                    if os.path.exists(screenshot_dir):
                        # 获取最新的匹配文件
                        matching_files = [f for f in os.listdir(screenshot_dir) if f.startswith(f'id_{img2_ref}_')]
                        if matching_files:
                            latest_file = max(matching_files)  # 获取最新的文件
                            img_path = os.path.join(screenshot_dir, latest_file)
                            try:
                                img2 = cv2.imread(img_path)
                                logger.info(f"从截图目录读取图像2: {img_path}")
                            except Exception as e:
                                logger.warning(f"无法从文件 {img_path} 读取图像2: {str(e)}")
                
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
            
            elif verification_key == '文本识别验证':
                # 导入OCR处理模块
                from .ocr import process_image
                import tempfile
                
                # 获取预期文本和操作界面截图ID
                expected_text = step.get('expected_text', '')
                screenshot_id = step.get('operation_screenshot', '')
                
                if not expected_text:
                    logger.error("文本识别验证缺少预期文本")
                    return {
                        'success': False,
                        'message': '文本识别验证缺少预期文本'
                    }
                
                if not screenshot_id:
                    logger.error("文本识别验证缺少操作界面截图ID")
                    return {
                        'success': False,
                        'message': '文本识别验证缺少操作界面截图ID'
                    }
                
                # 获取操作界面截图
                image = None
                
                # 首先尝试从操作步骤数据中获取图像
                if screenshot_id in operation_data and 'image' in operation_data[screenshot_id]:
                    image = operation_data[screenshot_id]['image']
                    logger.info(f"从操作步骤 {screenshot_id} 获取到图像")
                
                # 如果无法从操作步骤数据中获取，尝试从文件路径获取
                if image is None:
                    # 首先尝试从img目录获取（优先使用）
                    img_dir = os.path.join('data', 'img','operation_img')
                    if os.path.exists(img_dir):
                        # 获取最新的匹配文件
                        matching_files = [f for f in os.listdir(img_dir) if f.startswith(f'id_{screenshot_id}_')]
                        if matching_files:
                            latest_file = max(matching_files)  # 获取最新的文件
                            img_path = os.path.join(img_dir, latest_file)
                            try:
                                image = cv2.imread(img_path)
                                logger.info(f"从img目录读取图像: {img_path}")
                            except Exception as e:
                                logger.warning(f"无法从文件 {img_path} 读取图像: {str(e)}")
                
                # 如果在img目录中找不到，尝试在screenshot/upload目录中查找
                if image is None:
                    screenshot_dir = os.path.join('..', 'frontend', 'public', 'img', 'upload')
                    if os.path.exists(screenshot_dir):
                        # 获取最新的匹配文件
                        matching_files = [f for f in os.listdir(screenshot_dir) if f.startswith(f'id_{screenshot_id}_')]
                        if matching_files:
                            latest_file = max(matching_files)  # 获取最新的文件
                            img_path = os.path.join(screenshot_dir, latest_file)
                            try:
                                image = cv2.imread(img_path)
                                logger.info(f"从screenshot/upload目录读取图像: {img_path}")
                            except Exception as e:
                                logger.warning(f"无法从文件 {img_path} 读取图像: {str(e)}")
                
                
                # 如果仍然无法获取图像，返回失败
                if image is None:
                    logger.error(f"无法获取用于文本识别的图像: screenshot_id={screenshot_id}")
                    return {
                        'success': False,
                        'message': f'无法获取用于文本识别的图像: screenshot_id={screenshot_id}'
                    }
                
                try:
                    # 将图像保存为临时文件
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                        temp_path = temp_file.name
                        cv2.imwrite(temp_path, image)
                        logger.info(f"临时图像保存到: {temp_path}")
                    
                    # 使用OCR进行文本识别
                    ocr_result = process_image(temp_path)
                    
                    # 删除临时文件
                    try:
                        os.unlink(temp_path)
                    except Exception as e:
                        logger.warning(f"删除临时文件失败: {str(e)}")
                    
                    # 检查OCR结果是否包含错误
                    if ocr_result.get('error'):
                        logger.error(f"OCR处理出错: {ocr_result['error']}")
                        return {
                            'success': False,
                            'message': f"OCR处理出错: {ocr_result['error']}"
                        }
                    
                    # 获取识别的文本列表
                    text_results = ocr_result.get('text_results', [])
                    
                    # 将所有识别的文本连接成一个字符串，以便进行包含检查
                    all_text = ' '.join(text_results)
                    
                    # 检查识别结果是否包含预期文本
                    contains_text = expected_text in all_text
                    
                    logger.info(f"文本识别结果: {text_results}")
                    logger.info(f"预期文本: '{expected_text}'")
                    logger.info(f"验证结果: {'通过' if contains_text else '不通过'}")
                    
                    return {
                        'success': contains_text,
                        'message': f"文本识别验证 {'通过' if contains_text else '不通过'}: 预期文本 '{expected_text}' {'存在' if contains_text else '不存在'} 于识别结果中",
                        'details': {
                            'expected_text': expected_text,
                            'recognized_texts': text_results
                        }
                    }
                    
                except Exception as e:
                    logger.error(f"文本识别过程出错: {str(e)}")
                    return {
                        'success': False,
                        'message': f'文本识别过程出错: {str(e)}'
                    }
            
            elif verification_key == '截图精准匹配':
                # 获取参考截图和操作界面截图ID
                reference_screenshot = step.get('reference_screenshot', '')
                screenshot_id = step.get('operation_screenshot', '')
                threshold = float(step.get('threshold', 0.99))  # 获取用户设置的阈值，默认0.99
                
                if not reference_screenshot:
                    logger.error("截图精准匹配缺少参考截图")
                    return {
                        'success': False,
                        'message': '截图精准匹配缺少参考截图'
                    }
                
                if not screenshot_id:
                    logger.error("截图精准匹配缺少操作界面截图ID")
                    return {
                        'success': False,
                        'message': '截图精准匹配缺少操作界面截图ID'
                    }
                
                # 获取操作界面截图
                operation_image = None
                
                # 首先尝试从操作步骤数据中获取图像
                if screenshot_id in operation_data and 'image' in operation_data[screenshot_id]:
                    operation_image = operation_data[screenshot_id]['image']
                    logger.info(f"从操作步骤 {screenshot_id} 获取到操作界面截图")
                
                # 如果在img目录中找不到，尝试在img/upload目录中查找
                if operation_image is None:
                    screenshot_dir = os.path.join('..', 'frontend', 'public', 'screenshot', 'upload')
                    img_path = self.find_matching_file(screenshot_dir, f"id_{screenshot_id}_")
                    logger.info(f"从 {screenshot_dir} 获取到操作界面截图")
                    if img_path:
                        try:
                            operation_image = cv2.imread(img_path)
                            logger.info(f"从screenshot/upload目录读取操作界面截图: {img_path}")
                        except Exception as e:
                            logger.warning(f"无法从文件 {img_path} 读取操作界面截图: {str(e)}")
                
                # 如果无法从操作步骤数据中获取，尝试从文件路径获取
                if operation_image is None:
                    # 首先尝试从img/operation_img目录获取（优先使用）
                    img_dir = os.path.join('data', 'img', 'operation_img')
                    # 使用id_作为前缀和截图ID作为关键字查找匹配的文件
                    img_path = self.find_matching_file(img_dir, f"id_{screenshot_id}_")
                    
                    if img_path:
                        try:
                            operation_image = cv2.imread(img_path)
                            logger.info(f"从img/operation_img目录读取操作界面截图: {img_path}")
                        except Exception as e:
                            logger.warning(f"无法从文件 {img_path} 读取操作界面截图: {str(e)}")
                
                # # 如果在img/operation_img目录中找不到，尝试在img目录中查找
                # if operation_image is None:
                #     img_dir = os.path.join('data', 'img')
                #     img_path = self.find_matching_file(img_dir, f"id_{screenshot_id}_")
                    
                #     if img_path:
                #         try:
                #             operation_image = cv2.imread(img_path)
                #             logger.info(f"从img目录读取操作界面截图: {img_path}")
                #         except Exception as e:
                #             logger.warning(f"无法从文件 {img_path} 读取操作界面截图: {str(e)}")
                

                # 如果仍然无法获取操作界面截图，返回失败
                if operation_image is None:
                    logger.error(f"无法获取操作界面截图: screenshot_id={screenshot_id}")
                    return {
                        'success': False,
                        'message': f'无法获取操作界面截图: screenshot_id={screenshot_id}'
                    }
                
                # 获取参考截图
                reference_image = None
                
                # 尝试解析参考截图路径
                try:
                    # 检查是否是JSON字符串
                    if reference_screenshot.startswith('{') and reference_screenshot.endswith('}'):
                        # 解析JSON获取文件名
                        ref_data = json.loads(reference_screenshot)
                        ref_filename = ref_data.get('fileName')
                        
                        # 如果有文件名，从多个目录查找包含该文件名的文件
                        if ref_filename:
                            # 1. 先尝试public/screenshot/upload目录
                            img_path = self.find_matching_file(os.path.join('..', 'frontend', 'public', 'screenshot', 'upload'), ref_filename)
                            logger.info(f"✅ 日志输出路径：{img_path}")
                            if img_path and os.path.exists(img_path):
                                reference_image = cv2.imread(img_path)
                                logger.info(f"从public/screenshot/upload目录读取参考截图: {img_path}")
                            
                            # 2. 如果找不到，尝试data/img目录
                            if reference_image is None:
                                img_path = self.find_matching_file(os.path.join('..', 'data', 'img','operation_img'), ref_filename)
                                
                                if img_path and os.path.exists(img_path):
                                    reference_image = cv2.imread(img_path)
                                    logger.info(f"从data/img/operation_img目录读取参考截图: {img_path}")
                            
                            # 3. 如果仍找不到，尝试public/img/upload目录    
                            if reference_image is None:
                                img_path = self.find_matching_file(os.path.join('..', 'frontend', 'public', 'img', 'upload'), ref_filename)
                                
                                if img_path and os.path.exists(img_path):
                                    reference_image = cv2.imread(img_path)
                                    logger.info(f"从public/img/upload目录读取参考截图: {img_path}")
                    else:
                        # 直接使用路径
                        ref_filename = reference_screenshot
                        
                        if '/' in ref_filename:
                            # 如果包含路径分隔符，提取文件名
                            ref_filename = ref_filename.split('/')[-1]
                        
                        # 1. 先尝试public/screenshot/upload目录
                        img_path = self.find_matching_file(os.path.join('..', 'frontend', 'public', 'screenshot', 'upload'), ref_filename)
                        
                        if img_path and os.path.exists(img_path):
                            reference_image = cv2.imread(img_path)
                            logger.info(f"从public/screenshot/upload目录读取参考截图: {img_path}")
                        
                        # 2. 如果找不到，尝试public/img/upload目录
                        if reference_image is None:
                            img_path = self.find_matching_file(os.path.join('..', 'frontend', 'public', 'img', 'upload'), ref_filename)
                            
                            if img_path and os.path.exists(img_path):
                                reference_image = cv2.imread(img_path)
                                logger.info(f"从public/img/upload目录读取参考截图: {img_path}")
                        
                        # 3. 如果仍找不到，尝试data/img/operation_img目录
                        if reference_image is None:
                            img_path = self.find_matching_file(os.path.join('data', 'img', 'operation_img'), ref_filename)
                            
                            if img_path and os.path.exists(img_path):
                                reference_image = cv2.imread(img_path)
                                logger.info(f"从data/img/operation_img目录读取参考截图: {img_path}")
                except Exception as e:
                    logger.warning(f"解析参考截图路径出错: {str(e)}")
                
                # 如果仍然无法获取参考截图，返回失败
                if reference_image is None:
                    logger.error(f"无法获取参考截图: reference_screenshot={reference_screenshot}")
                    return {
                        'success': False,
                        'message': f'无法获取参考截图'
                    }
                
                try:
                    # 使用ImageComparator的is_ssim方法进行精准匹配
                    
                    # 确保图像尺寸相同
                    if reference_image.shape != operation_image.shape:
                        reference_image = cv2.resize(reference_image, (operation_image.shape[1], operation_image.shape[0]))
                        logger.info("调整参考截图尺寸以匹配操作界面截图")
                    
                    # 使用用户设置的阈值作为上限，0.5作为下限
                    match_result = ImageComparator.is_ssim(operation_image, reference_image, threshold=threshold, min_threshold=0.5)
                    
                    logger.info(f"截图精准匹配结果: {'通过' if match_result else '不通过'}, 阈值: {threshold}")
                    
                    return {
                        'success': match_result,
                        'message': f"截图精准匹配 {'通过' if match_result else '不通过'} (阈值: {threshold})",
                    }
                    
                except Exception as e:
                    logger.error(f"截图精准匹配过程出错: {str(e)}")
                    return {
                        'success': False,
                        'message': f'截图精准匹配过程出错: {str(e)}'
                    }
            
            elif verification_key == '截图包含匹配':
                # 获取参考内容和操作界面截图ID
                reference_content = step.get('reference_content', '')
                screenshot_id = step.get('operation_screenshot', '')
                threshold = float(step.get('threshold', 0.8))  # 获取用户设置的阈值，默认0.8
                
                if not reference_content:
                    logger.error("截图包含匹配缺少参考内容")
                    return {
                        'success': False,
                        'message': '截图包含匹配缺少参考内容'
                    }
                
                if not screenshot_id:
                    logger.error("截图包含匹配缺少操作界面截图ID")
                    return {
                        'success': False,
                        'message': '截图包含匹配缺少操作界面截图ID'
                    }
                
                # 获取操作界面截图
                operation_image = None
                
                # 首先尝试从操作步骤数据中获取图像
                if screenshot_id in operation_data and 'image' in operation_data[screenshot_id]:
                    operation_image = operation_data[screenshot_id]['image']
                    logger.info(f"从操作步骤 {screenshot_id} 获取到操作界面截图")
                
                # 如果无法从操作步骤数据中获取，尝试从文件路径获取
                if operation_image is None:
                    # 首先尝试从img/operation_img目录获取（优先使用）
                    img_dir = os.path.join('data', 'img', 'operation_img')
                    # 使用id_作为前缀和截图ID作为关键字查找匹配的文件
                    img_path = self.find_matching_file(img_dir, f"id_{screenshot_id}_")
                    
                    if img_path:
                        try:
                            operation_image = cv2.imread(img_path)
                            logger.info(f"从img/operation_img目录读取操作界面截图: {img_path}")
                        except Exception as e:
                            logger.warning(f"无法从文件 {img_path} 读取操作界面截图: {str(e)}")
                
                # 如果在img/operation_img目录中找不到，尝试在img目录中查找
                if operation_image is None:
                    img_dir = os.path.join('data', 'img')
                    img_path = self.find_matching_file(img_dir, f"id_{screenshot_id}_")
                    
                    if img_path:
                        try:
                            operation_image = cv2.imread(img_path)
                            logger.info(f"从img目录读取操作界面截图: {img_path}")
                        except Exception as e:
                            logger.warning(f"无法从文件 {img_path} 读取操作界面截图: {str(e)}")
                
                # 如果在img目录中找不到，尝试在public/screenshot/upload目录中查找
                if operation_image is None:
                    screenshot_dir = os.path.join('..', 'frontend', 'public', 'screenshot', 'upload')
                    img_path = self.find_matching_file(screenshot_dir, f"id_{screenshot_id}_")
                    
                    if img_path:
                        try:
                            operation_image = cv2.imread(img_path)
                            logger.info(f"从screenshot/upload目录读取操作界面截图: {img_path}")
                        except Exception as e:
                            logger.warning(f"无法从文件 {img_path} 读取操作界面截图: {str(e)}")
                
                # 如果仍然无法获取操作界面截图，返回失败
                if operation_image is None:
                    logger.error(f"无法获取操作界面截图: screenshot_id={screenshot_id}")
                    return {
                        'success': False,
                        'message': f'无法获取操作界面截图: screenshot_id={screenshot_id}'
                    }
                
                # 获取参考内容
                reference_image = None
                
                # 尝试解析参考内容路径
                try:
                    # 检查是否是JSON字符串
                    if reference_content.startswith('{') and reference_content.endswith('}'):
                        # 解析JSON获取文件名
                        ref_data = json.loads(reference_content)
                        ref_filename = ref_data.get('fileName')
                        
                        # 如果有文件名，从多个目录查找包含该文件名的文件
                        if ref_filename:
                            # 1. 先尝试public/screenshot/upload目录
                            img_path = self.find_matching_file(os.path.join('..', 'frontend', 'public', 'img', 'upload'), ref_filename)
                            
                            if img_path and os.path.exists(img_path):
                                reference_image = cv2.imread(img_path)
                                logger.info(f"从public/img/upload目录读取参考内容: {img_path}")
                            
                            # 2. 如果找不到，尝试data/img目录
                            if reference_image is None:
                                img_path = self.find_matching_file(os.path.join('data', 'img'), ref_filename)
                                
                                if img_path and os.path.exists(img_path):
                                    reference_image = cv2.imread(img_path)
                                    logger.info(f"从data/img目录读取参考内容: {img_path}")
                            
                            # 3. 如果仍找不到，尝试data/img/operation_img目录
                            if reference_image is None:
                                img_path = self.find_matching_file(os.path.join('data', 'img', 'operation_img'), ref_filename)
                                
                                if img_path and os.path.exists(img_path):
                                    reference_image = cv2.imread(img_path)
                                    logger.info(f"从data/img/operation_img目录读取参考内容: {img_path}")
                    else:
                        # 直接使用路径
                        ref_filename = reference_content
                        
                        if '/' in ref_filename:
                            # 如果包含路径分隔符，提取文件名
                            ref_filename = ref_filename.split('/')[-1]
                        
                        # 1. 先尝试public/screenshot/upload目录
                        img_path = self.find_matching_file(os.path.join('..', 'frontend', 'public', 'img', 'upload'), ref_filename)
                        
                        if img_path and os.path.exists(img_path):
                            reference_image = cv2.imread(img_path)
                            logger.info(f"从public/img/upload目录读取参考内容: {img_path}")
                        
                        # 2. 如果找不到，尝试data/img目录
                        if reference_image is None:
                            img_path = self.find_matching_file(os.path.join('data', 'img'), ref_filename)
                            
                            if img_path and os.path.exists(img_path):
                                reference_image = cv2.imread(img_path)
                                logger.info(f"从data/img目录读取参考内容: {img_path}")
                        
                        # 3. 如果仍找不到，尝试data/img/operation_img目录
                        if reference_image is None:
                            img_path = self.find_matching_file(os.path.join('data', 'img', 'operation_img'), ref_filename)
                            
                            if img_path and os.path.exists(img_path):
                                reference_image = cv2.imread(img_path)
                                logger.info(f"从data/img/operation_img目录读取参考内容: {img_path}")
                except Exception as e:
                    logger.warning(f"解析参考内容路径出错: {str(e)}")
                
                # 如果仍然无法获取参考内容，返回失败
                if reference_image is None:
                    logger.error(f"无法获取参考内容: reference_content={reference_content}")
                    return {
                        'success': False,
                        'message': f'无法获取参考内容'
                    }
                
                try:
                    # 使用ImageComparator的template_matching方法进行包含匹配
                    # from .image_comparator import ImageComparator
                    
                    # 确保参考内容尺寸小于操作界面截图尺寸
                    if reference_image.shape[0] > operation_image.shape[0] or reference_image.shape[1] > operation_image.shape[1]:
                        # 调整参考内容尺寸，确保其不大于操作界面截图
                        scale = min(operation_image.shape[0] / reference_image.shape[0], 
                                  operation_image.shape[1] / reference_image.shape[1])
                        if scale < 1:  # 只有需要缩小时才调整
                            new_height = int(reference_image.shape[0] * scale)
                            new_width = int(reference_image.shape[1] * scale)
                            reference_image = cv2.resize(reference_image, (new_width, new_height))
                            logger.info(f"调整参考内容尺寸为 {new_width}x{new_height}")
                    
                    # 使用用户设置的阈值进行模板匹配
                    match_result = ImageComparator.template_matching(operation_image, reference_image, threshold=threshold)
                    
                    logger.info(f"截图包含匹配结果: {'通过' if match_result else '不通过'}, 阈值: {threshold}")
                    
                    return {
                        'success': match_result,
                        'message': f"截图包含匹配 {'通过' if match_result else '不通过'} (阈值: {threshold})",
                    }
                    
                except Exception as e:
                    logger.error(f"截图包含匹配过程出错: {str(e)}")
                    return {
                        'success': False,
                        'message': f'截图包含匹配过程出错: {str(e)}'
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

    def set_operation_interval(self, interval_seconds):
        """
        设置操作步骤之间的间隔时间
        
        Args:
            interval_seconds (float): 间隔时间，单位为秒
        """
        if interval_seconds >= 0:
            self.operation_interval = interval_seconds
        else:
            logger.warning(f"无效的间隔时间 {interval_seconds}，使用默认值 {self.DEFAULT_OPERATION_INTERVAL}")
            self.operation_interval = self.DEFAULT_OPERATION_INTERVAL 