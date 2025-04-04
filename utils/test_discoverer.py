import unittest
import importlib
import pkgutil
import inspect
from pathlib import Path
import vp_180.tests

class TestDiscoverer:
    def __init__(self, excluded_tests=None, ssh_connection=None):
        self.excluded_tests = excluded_tests or []
        self.ssh_connection = ssh_connection

    def discover_test_cases(self):
        """自动发现所有测试用例"""
        test_cases = []
        tests_dir = Path(vp_180.tests.__file__).parent
        
        # 遍历tests目录下的所有Python文件
        for (_, module_name, _) in pkgutil.iter_modules([str(tests_dir)]):
            if module_name.startswith('Test_'):  # 只处理以Test_开头的模块
                try:
                    # 导入模块
                    module = importlib.import_module(f"vp_180.tests.{module_name}")
                    
                    # 查找模块中的测试类
                    for name, obj in inspect.getmembers(module):
                        if (inspect.isclass(obj) and 
                            issubclass(obj, unittest.TestCase) and 
                            name.startswith('Test_') and 
                            name not in self.excluded_tests):  # 排除不需要执行的测试
                            
                            # 如果测试类需要SSH连接，则传递SSH连接对象
                            if 'ssh_connection' in inspect.signature(obj.__init__).parameters:
                                test_instance = obj(self.ssh_connection)
                                test_cases.append(test_instance.__class__)
                            else:
                                test_cases.append(obj)
                                
                            print(f"✅ 已加载测试用例: {name}")
                            
                except ImportError as e:
                    print(f"⚠️ 无法导入模块 {module_name}: {e}")
        
        if self.excluded_tests:
            print("\n🚫 以下测试用例将不会执行:")
            for test in self.excluded_tests:
                print(f"  - {test}")
        
        return test_cases 