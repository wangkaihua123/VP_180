"""
SSH连接测试脚本

用于测试通过SSH连接的SSH连接管理功能
"""

import time
import sys
import os
import logging

# 设置日志格式
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入SSH管理器
from utils.ssh_manager import SSHManager

def test_ssh_connection():
    """测试SSH连接管理功能"""
    logger = logging.getLogger("SSH连接测试")
    
    try:
        # 获取SSH管理器实例
        logger.info("获取SSH连接SSH管理器实例...")
        ssh_manager = SSHManager.get_instance()
        
        # 执行测试命令
        logger.info("执行SSH连接测试命令...")
        result = ssh_manager.execute_command("echo 'SSH连接测试成功'")
        logger.info(f"SSH连接命令执行结果: {result}")
        
        # 测试连接稳定性
        logger.info("测试SSH连接稳定性，每10秒执行一次命令...")
        for i in range(3):  # 减少测试次数，因为隧道连接可能较慢
            time.sleep(10)
            result = ssh_manager.execute_command("date")
            logger.info(f"第{i+1}次SSH连接命令执行结果: {result}")
        
    except Exception as e:
        logger.error(f"SSH连接测试过程中出错: {e}")
    finally:
        # 清理资源
        logger.info("SSH连接测试完成，清理资源...")
        SSHManager.disconnect_all()

if __name__ == "__main__":
    test_ssh_connection()