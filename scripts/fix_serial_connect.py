"""
修复串口连接标志 - 将ID为10的测试用例的serial_connect字段设置为true
用法: python scripts/fix_serial_connect.py
"""
import os
import sys
import json
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 测试用例文件路径
TEST_CASES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'test_cases.json')

def main():
    """主函数 - 修复ID为10的测试用例的serial_connect字段"""
    logger.info(f"开始修复测试用例: {TEST_CASES_FILE}")
    
    # 检查文件是否存在
    if not os.path.exists(TEST_CASES_FILE):
        logger.error(f"测试用例数据文件不存在: {TEST_CASES_FILE}")
        return False
    
    try:
        # 读取文件
        with open(TEST_CASES_FILE, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
        
        # 找到ID为10的测试用例
        target_case = None
        for test_case in test_cases:
            if test_case.get('id') == 10:
                target_case = test_case
                break
        
        if not target_case:
            logger.error("未找到ID为10的测试用例")
            return False
        
        # 检查并修改serial_connect字段
        if target_case.get('serial_connect') is False:
            logger.info(f"发现ID为10的测试用例 '{target_case.get('title')}' 的serial_connect字段为false")
            target_case['serial_connect'] = True
            logger.info("已将serial_connect字段修改为true")
            
            # 保存修改后的数据
            with open(TEST_CASES_FILE, 'w', encoding='utf-8') as f:
                json.dump(test_cases, f, ensure_ascii=False, indent=2)
            
            logger.info("修改已保存")
            return True
        else:
            logger.info(f"ID为10的测试用例 '{target_case.get('title')}' 的serial_connect字段已经是正确的值")
            return True
        
    except Exception as e:
        logger.error(f"修复测试用例时出错: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("修复操作成功完成")
    else:
        logger.error("修复操作失败")
        sys.exit(1) 