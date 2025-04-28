"""
自动检测需要串口连接的测试用例 - 检测所有包含串口操作的测试用例，并确保它们的serial_connect字段设置为true
用法: python scripts/auto_detect_serial_connect.py
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

# 需要串口连接的操作关键字列表
SERIAL_OPERATIONS = ['串口开机', '串口关机']

def main():
    """主函数 - 自动检测需要串口连接的测试用例并修复"""
    logger.info(f"开始检查测试用例: {TEST_CASES_FILE}")
    
    # 检查文件是否存在
    if not os.path.exists(TEST_CASES_FILE):
        logger.error(f"测试用例数据文件不存在: {TEST_CASES_FILE}")
        return False
    
    try:
        # 读取文件
        with open(TEST_CASES_FILE, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
        
        # 记录是否需要保存修改
        needs_save = False
        fixed_count = 0
        
        # 遍历所有测试用例
        for test_case in test_cases:
            # 解析script_content
            if 'script_content' in test_case and test_case['script_content']:
                try:
                    script = json.loads(test_case['script_content'])
                    
                    # 检查是否包含串口操作
                    has_serial_operation = False
                    if 'operationSteps' in script:
                        for step in script['operationSteps']:
                            if 'operation_key' in step and step['operation_key'] in SERIAL_OPERATIONS:
                                has_serial_operation = True
                                break
                    
                    # 如果包含串口操作但serial_connect为false，则修改
                    if has_serial_operation and test_case.get('serial_connect') is False:
                        logger.info(f"检测到ID为{test_case['id']}的测试用例 '{test_case['title']}' 包含串口操作，但serial_connect字段为false")
                        test_case['serial_connect'] = True
                        needs_save = True
                        fixed_count += 1
                        logger.info(f"已将测试用例 '{test_case['title']}' 的serial_connect字段修改为true")
                
                except json.JSONDecodeError:
                    logger.warning(f"无法解析测试用例 '{test_case.get('title', '未知')}' 的script_content")
        
        # 如果有修改，保存文件
        if needs_save:
            with open(TEST_CASES_FILE, 'w', encoding='utf-8') as f:
                json.dump(test_cases, f, ensure_ascii=False, indent=2)
            logger.info(f"成功修复 {fixed_count} 个测试用例")
        else:
            logger.info("未发现需要修复的测试用例")
        
        return True
        
    except Exception as e:
        logger.error(f"检查测试用例时出错: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("检查和修复操作成功完成")
    else:
        logger.error("检查和修复操作失败")
        sys.exit(1) 