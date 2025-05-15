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
        """
        执行录制的步骤
        
        Args:
            recorded_steps: 录制的步骤列表
            
        Returns:
            dict: 执行结果
        """
        try:
            if not recorded_steps:
                return {
                    'success': False,
                    'message': '没有可执行的录制步骤'
                }
                
            results = []
            previous_timestamp = None
            
            for step in recorded_steps:
                # 获取步骤类型
                step_type = step.get('type')
                
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
                            time.sleep(time_diff)
                    except Exception as e:
                        logger.warning(f"处理时间间隔时出错: {str(e)}")
                
                # 执行步骤
                if step_type == '触摸坐标':
                    x = step.get('x', 0)
                    y = step.get('y', 0)
                    duration = step.get('duration', 0)
                    
                    # 根据duration决定是点击还是长按
                    if duration > 0.3:  # 大于0.3秒视为长按
                        success = self.button_clicker.long_click(
                            x=x,
                            y=y,
                            description=f'长按坐标({x},{y})'
                        )
                    else:
                        success = self.button_clicker.click_button(
                            x=x,
                            y=y,
                            button_name='',
                            description=f'点击坐标({x},{y})'
                        )
                    
                    results.append({
                        'success': success,
                        'message': f'执行{step_type}: ({x}, {y}), 持续时间: {duration}秒'
                    })
                
                previous_timestamp = current_timestamp
            
            # 检查所有步骤是否都成功执行
            all_success = all(result['success'] for result in results)
            
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