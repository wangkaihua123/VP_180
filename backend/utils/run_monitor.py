"""
运行监视器模块

该模块用于执行和管理录制的触摸操作步骤。主要功能包括：
1. 执行预先录制的触摸操作序列
2. 控制操作之间的时间间隔
3. 支持点击和长按操作
4. 提供操作执行结果的反馈

主要类：
- RunMonitor: 负责执行录制的触摸操作步骤，管理操作时序和结果反馈
"""

import logging
import time
from .button_clicker import ButtonClicker
from .log_config import setup_logger

logger = setup_logger(__name__)

class RunMonitor:
    def __init__(self, ssh_connection=None):
        """
        初始化运行监视器
        
        Args:
            ssh_connection: SSH连接实例
        """
        self.ssh = ssh_connection
        self.button_clicker = ButtonClicker(ssh_connection)
        
    def execute_recorded_steps(self, recorded_steps):
        try:
            if not recorded_steps:
                return {
                    'success': False,
                    'message': '没有可执行的录制步骤'
                }
            
            logger.info(f"开始执行 {len(recorded_steps)} 个录制步骤")
            results = []
            previous_timestamp = None
            
            for i, step in enumerate(recorded_steps):
                # 获取步骤类型
                step_type = step.get('type')
                logger.info(f"执行第 {i+1}/{len(recorded_steps)} 个步骤: {step_type}")
                
                # 处理时间间隔
                current_timestamp = step.get('timestamp')
                if previous_timestamp and current_timestamp:
                    try:
                        # 将时间字符串转换为时间戳
                        current_time = time.strptime(current_timestamp.split('.')[0], "%Y-%m-%dT%H:%M:%S")
                        previous_time = time.strptime(previous_timestamp.split('.')[0], "%Y-%m-%dT%H:%M:%S")
                        
                        # 计算时间差并等待
                        time_diff = time.mktime(current_time) - time.mktime(previous_time)
                        if time_diff > 0:
                            logger.info(f"等待时间间隔: {time_diff} 秒")
                            time.sleep(time_diff)
                    except Exception as e:
                        logger.warning(f"处理时间间隔时出错: {str(e)}")
                
                # 执行步骤
                if step_type == '触摸坐标':
                    x = float(step.get('x', 0))
                    y = float(step.get('y', 0))
                    duration = float(step.get('duration', 0))
                    
                    logger.info(f"执行触摸操作: 坐标({x}, {y}), 持续时间: {duration}秒")
                    
                    # 使用button_clicker的click_button方法，传入touch_duration参数
                    success = self.button_clicker.click_button(
                        x=int(x),
                        y=int(y),
                        button_name='',
                        description=f'点击坐标({x},{y})',
                        touch_duration=duration
                    )
                    
                    if success:
                        logger.info(f"触摸操作执行成功: ({x}, {y})")
                    else:
                        logger.error(f"触摸操作执行失败: ({x}, {y})")
                    
                    results.append({
                        'success': success,
                        'message': f'执行{step_type}: ({x}, {y}), 持续时间: {duration}秒'
                    })
                else:
                    logger.info(f"跳过非触摸操作步骤: {step_type}")
                    results.append({
                        'success': True,
                        'message': f'跳过步骤: {step_type}'
                    })
                
                previous_timestamp = current_timestamp
            
            # 检查所有步骤是否都成功执行
            all_success = all(result['success'] for result in results)
            
            logger.info(f"录制步骤执行完成，总体结果: {'成功' if all_success else '失败'}")
            
            return {
                'success': all_success,
                'message': '所有录制步骤执行完成' if all_success else '部分步骤执行失败',
                'details': results
            }
            
        except Exception as e:
            logger.error(f"执行录制步骤时出错: {str(e)}")
            return {
                'success': False,
                'message': f'执行出错: {str(e)}'
            }
