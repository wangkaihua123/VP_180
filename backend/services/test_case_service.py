"""
测试用例服务 - 处理测试用例的执行和管理
"""
import logging
import os
from datetime import datetime
from utils.test_case_executor import TestCaseExecutor
from backend.models.test_case import TestCase
from backend.services.ssh_service import SSHService
from backend.config import IMAGES_DIR, SCREENSHOTS_DIR

logger = logging.getLogger(__name__)

class TestCaseService:
    """测试用例服务类，处理测试用例的执行和管理"""
    
    @classmethod
    def get_all(cls):
        """获取所有测试用例"""
        return TestCase.get_all()
    
    @classmethod
    def get_by_id(cls, case_id):
        """根据ID获取测试用例"""
        return TestCase.get_by_id(case_id)
    
    @classmethod
    def create(cls, test_case_data):
        """创建新测试用例"""
        return TestCase.create(test_case_data)
    
    @classmethod
    def update(cls, case_id, test_case_data):
        """更新测试用例"""
        return TestCase.update(case_id, test_case_data)
    
    @classmethod
    def delete(cls, case_id):
        """删除测试用例"""
        return TestCase.delete(case_id)
    
    @classmethod
    def run(cls, case_id):
        """执行单个测试用例"""
        # 获取测试用例
        case = TestCase.get_by_id(case_id)
        if not case:
            logger.error(f"测试用例不存在: {case_id}")
            return {
                'success': False,
                'message': '测试用例不存在'
            }
        
        # 获取SSH连接
        ssh = SSHService.get_client()
        if not ssh:
            logger.error("SSH连接失败")
            return {
                'success': False,
                'message': 'SSH连接失败'
            }
        
        try:
            # 执行测试用例
            executor = TestCaseExecutor(ssh)
            result = executor.execute_test_case(case)
            
            # 更新测试用例状态
            TestCase.update_status(case_id, result['status'])
            
            return {
                'success': True,
                'message': '测试已执行',
                'status': result['status'],
                'details': result
            }
        except Exception as e:
            logger.error(f"执行测试用例时出错: {str(e)}")
            return {
                'success': False,
                'message': f'执行测试用例失败: {str(e)}'
            }
    
    @classmethod
    def run_batch(cls, case_ids):
        """批量执行测试用例"""
        if not case_ids:
            return {
                'success': False,
                'message': '未指定测试用例ID'
            }
        
        # 获取SSH连接
        ssh = SSHService.get_client()
        if not ssh:
            logger.error("SSH连接失败")
            return {
                'success': False,
                'message': 'SSH连接失败'
            }
        
        try:
            # 执行指定的测试用例
            executor = TestCaseExecutor(ssh)
            results = []
            
            for case_id in case_ids:
                case = TestCase.get_by_id(case_id)
                if not case:
                    continue
                    
                result = executor.execute_test_case(case)
                TestCase.update_status(case_id, result['status'])
                
                results.append({
                    'id': case['id'],
                    'title': case['title'],
                    'status': result['status'],
                    'details': result
                })
            
            return {
                'success': True,
                'message': f'已执行{len(results)}个测试用例',
                'results': results
            }
        except Exception as e:
            logger.error(f"执行批量测试用例时出错: {str(e)}")
            return {
                'success': False,
                'message': f'执行测试用例失败: {str(e)}'
            }
    
    @classmethod
    def run_all(cls):
        """执行所有测试用例"""
        # 获取所有测试用例ID
        test_cases = TestCase.get_all()
        case_ids = [case['id'] for case in test_cases]
        
        # 调用批量执行方法
        return cls.run_batch(case_ids)
    
    @classmethod
    def get_latest_log(cls, case_id):
        """获取测试用例的最新日志 - 已移除日志文件访问功能"""
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # 获取截图
            screenshots = []
            if os.path.exists(SCREENSHOTS_DIR):
                screenshot_files = [f for f in os.listdir(SCREENSHOTS_DIR) if f.endswith(('.png', '.jpg', '.jpeg', '.tiff'))]
                for file in screenshot_files:
                    screenshots.append(f'/api/files/screenshots/{file}')

            # 获取图片
            images = []
            if os.path.exists(IMAGES_DIR):
                image_files = [f for f in os.listdir(IMAGES_DIR) if f.endswith(('.png', '.jpg', '.jpeg', '.tiff'))]
                for file in image_files:
                    images.append(f'/api/files/images/{file}')

            return {
                'success': True,
                'data': {
                    'log_content': "日志功能已禁用",
                    'images': images,
                    'screenshots': screenshots,
                    'timestamp': timestamp
                }
            }

        except Exception as e:
            logger.error(f"获取测试资源时出错: {str(e)}")
            return {
                'success': False,
                'message': f'获取资源失败: {str(e)}'
            }
    
    @classmethod
    def get_method_mappings(cls):
        """获取方法映射"""
        method_mappings = {
            'operations': [
                {'id': 'click', 'name': '点击元素', 'params': ['element_id']},
                {'id': 'input', 'name': '输入文本', 'params': ['element_id', 'text']},
                {'id': 'select', 'name': '选择选项', 'params': ['element_id', 'option']},
                {'id': 'navigate', 'name': '导航到页面', 'params': ['url']}
            ],
            'validations': [
                {'id': 'assert_text', 'name': '验证文本', 'params': ['element_id', 'expected_text']},
                {'id': 'assert_visible', 'name': '验证元素可见', 'params': ['element_id']},
                {'id': 'assert_not_visible', 'name': '验证元素不可见', 'params': ['element_id']}
            ]
        }
        
        return method_mappings 