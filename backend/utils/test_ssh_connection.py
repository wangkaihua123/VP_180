"""
SSH连接测试脚本

用于测试优化后的SSH连接管理功能
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
from backend.utils.ssh_manager import SSHManager, SSHConnectionService

def test_ssh_connection():
    """测试SSH连接管理功能"""
    logger = logging.getLogger("SSH连接测试")
    
    try:
        # 初始化SSH连接服务
        logger.info("启动SSH连接服务...")
        service = SSHConnectionService.get_instance()
        service.start()
        
        # 等待连接建立
        logger.info("等待连接建立...")
        time.sleep(2)
        
        # 检查连接状态
        status = SSHManager.get_connection_status()
        logger.info(f"连接状态: {status['connected']}")
        
        # 执行测试命令
        logger.info("执行测试命令...")
        ssh_manager = SSHManager.get_instance()
        result = ssh_manager.execute_command("echo 'SSH连接测试成功'")
        logger.info(f"命令执行结果: {result}")
        
        # 获取诊断信息
        diagnostics = SSHManager.get_diagnostics()
        logger.info(f"连接诊断: 传输层活动={diagnostics['transport_active']}, 网络可达={diagnostics['network_reachable']}")
        logger.info(f"连接统计: {diagnostics['connection_stats']}")
        
        # 测试连接稳定性
        logger.info("测试连接稳定性，每5秒执行一次命令...")
        for i in range(5):
            time.sleep(5)
            result = ssh_manager.execute_command("date")
            logger.info(f"第{i+1}次命令执行结果: {result}")
            
        # 测试重连功能
        logger.info("测试重连功能...")
        ssh_manager.disconnect()
        logger.info("连接已断开，等待自动重连...")
        time.sleep(10)
        
        # 检查重连后状态
        status = SSHManager.get_connection_status()
        logger.info(f"重连后状态: {status['connected']}")
        
        # 再次执行命令验证
        result = ssh_manager.execute_command("echo '重连后测试'")
        logger.info(f"重连后命令执行结果: {result}")
        
    except Exception as e:
        logger.error(f"测试过程中出错: {e}")
    finally:
        # 清理资源
        logger.info("测试完成，清理资源...")
        SSHManager.disconnect_all()

if __name__ == "__main__":
    test_ssh_connection() 