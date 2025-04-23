"""
测试用例模型 - 负责测试用例数据的加载和保存
"""
import json
import os
import logging
from datetime import datetime
from backend.config import TEST_CASES_FILE, DEFAULT_TEST_CASE

logger = logging.getLogger(__name__)

class TestCase:
    """测试用例模型类，管理测试用例数据"""
    
    _test_cases = None  # 缓存测试用例列表
    
    @classmethod
    def load(cls):
        """加载测试用例数据"""
        try:
            if os.path.exists(TEST_CASES_FILE):
                with open(TEST_CASES_FILE, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:  # 如果文件不为空
                        data = json.loads(content)
                        # 转换字段名
                        converted_data = []
                        for test_case in data:
                            converted_case = cls._convert_keys(test_case)
                            converted_data.append(converted_case)
                        logger.info(f"成功从文件加载测试用例: {TEST_CASES_FILE}")
                        cls._test_cases = converted_data
                        return converted_data
            
            logger.info(f"测试用例文件不存在或为空，使用默认数据")
            # 使用默认数据
            default_data = [dict(DEFAULT_TEST_CASE)]
            default_data[0]['create_time'] = datetime.now().strftime('%Y-%m-%d %H:%M')
            cls._test_cases = default_data
            return default_data
            
        except Exception as e:
            logger.error(f"加载测试用例数据出错: {e}")
            default_data = [dict(DEFAULT_TEST_CASE)]
            default_data[0]['create_time'] = datetime.now().strftime('%Y-%m-%d %H:%M')
            cls._test_cases = default_data
            return default_data
    
    @classmethod
    def save(cls, test_cases):
        """保存测试用例数据"""
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(TEST_CASES_FILE), exist_ok=True)
            
            # 转换字段名
            converted_test_cases = [cls._convert_keys(test_case) for test_case in test_cases]
            
            # 保存数据
            with open(TEST_CASES_FILE, 'w', encoding='utf-8') as f:
                json.dump(converted_test_cases, f, ensure_ascii=False, indent=2)
                
            logger.info(f"成功保存测试用例到文件: {TEST_CASES_FILE}")
            cls._test_cases = converted_test_cases
            return True
        except Exception as e:
            logger.error(f"保存测试用例数据出错: {e}")
            return False
    
    @staticmethod
    def _convert_keys(test_case):
        """转换测试用例字段名，保持一致性"""
        converted_case = test_case.copy()
        if 'script_content' in test_case:
            try:
                content = json.loads(test_case['script_content'])
                if 'operationSteps' in content:
                    content['operationSteps'] = [
                        {
                            **step,
                            'operation_key': step.get('operation_type', step.get('operation_key', '')),
                            'operation_type': None
                        } if isinstance(step, dict) else step
                        for step in content['operationSteps']
                    ]
                    content['operationSteps'] = [
                        {k: v for k, v in step.items() if v is not None}
                        for step in content['operationSteps']
                    ]
                if 'verificationSteps' in content:
                    content['verificationSteps'] = [
                        {
                            **step,
                            'verification_key': step.get('verification_type', step.get('verification_key', '')),
                            'verification_type': None
                        } if isinstance(step, dict) else step
                        for step in content['verificationSteps']
                    ]
                    content['verificationSteps'] = [
                        {k: v for k, v in step.items() if v is not None}
                        for step in content['verificationSteps']
                    ]
                converted_case['script_content'] = json.dumps(content, ensure_ascii=False)
            except json.JSONDecodeError:
                pass
        return converted_case
    
    @classmethod
    def get_all(cls):
        """获取所有测试用例"""
        # 不使用缓存，每次都重新加载最新数据
        return cls.load()
    
    @classmethod
    def get_by_id(cls, case_id):
        """根据ID获取测试用例"""
        test_cases = cls.get_all()
        return next((case for case in test_cases if case['id'] == case_id), None)
    
    @classmethod
    def create(cls, test_case_data):
        """创建新测试用例"""
        test_cases = cls.get_all()
        
        # 生成新ID
        new_id = max([case['id'] for case in test_cases]) + 1 if test_cases else 1
        
        # 创建新测试用例
        new_case = {
            'id': new_id,
            'title': test_case_data.get('title', ''),
            'type': test_case_data.get('type', '功能测试'),
            'status': '未运行',
            'create_time': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'last_execution_time': '',  # 添加空的最新执行时间
            'description': test_case_data.get('description', ''),
            'script_content': test_case_data.get('script_content', '')
        }
        
        # 添加到列表并保存
        test_cases.append(new_case)
        if cls.save(test_cases):
            return new_case
        return None
    
    @classmethod
    def update(cls, case_id, test_case_data):
        """更新测试用例"""
        test_cases = cls.get_all()
        case = cls.get_by_id(case_id)
        
        if not case:
            return None
        
        # 更新字段
        case['title'] = test_case_data.get('title', case['title'])
        case['type'] = test_case_data.get('type', case['type'])
        case['description'] = test_case_data.get('description', case['description'])
        case['script_content'] = test_case_data.get('script_content', case['script_content'])
        
        # 保存更新
        if cls.save(test_cases):
            return case
        return None
    
    @classmethod
    def delete(cls, case_id):
        """删除测试用例"""
        test_cases = cls.get_all()
        case = cls.get_by_id(case_id)
        
        if not case:
            return False
        
        # 从列表中移除
        test_cases.remove(case)
        return cls.save(test_cases)
    
    @classmethod
    def update_status(cls, case_id, status):
        """更新测试用例状态"""
        test_cases = cls.get_all()
        case = cls.get_by_id(case_id)
        
        if not case:
            return False
        
        # 更新状态和最新执行时间
        case['status'] = status
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        case['last_execution_time'] = current_time  # 更新最新执行时间
        
        return cls.save(test_cases) 