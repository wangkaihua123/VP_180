"""
修复测试用例数据工具 - 确保所有测试用例都具有正确的字段
用法: python -m backend.tools.fix_test_cases
"""
import os
import sys
import json
import logging

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# 导入测试用例模型
from backend.models.test_case import TestCase
from backend.config import TEST_CASES_FILE

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """主函数 - 修复测试用例数据"""
    logger.info(f"开始修复测试用例数据文件: {TEST_CASES_FILE}")
    
    # 检查文件是否存在
    if not os.path.exists(TEST_CASES_FILE):
        logger.error(f"测试用例数据文件不存在: {TEST_CASES_FILE}")
        return False
    
    try:
        # 直接读取原始文件
        with open(TEST_CASES_FILE, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
        
        original_count = len(test_cases)
        fixed_count = 0
        
        # 修复每个测试用例
        for test_case in test_cases:
            if 'serial_connect' not in test_case:
                test_case['serial_connect'] = False
                fixed_count += 1
                logger.info(f"为测试用例 {test_case.get('id', 'unknown')} ({test_case.get('title', 'unknown')}) 添加missing serial_connect字段")
        
        # 保存修复后的数据
        with open(TEST_CASES_FILE, 'w', encoding='utf-8') as f:
            json.dump(test_cases, f, ensure_ascii=False, indent=2)
        
        logger.info(f"修复完成! 总共处理 {original_count} 个测试用例，修复了 {fixed_count} 个缺失字段。")
        return True
        
    except Exception as e:
        logger.error(f"修复测试用例数据时出错: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("修复操作成功完成")
    else:
        logger.error("修复操作失败")
        sys.exit(1) 