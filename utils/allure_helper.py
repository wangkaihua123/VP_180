import os
import json
import uuid
import time
from datetime import datetime

class AllureHelper:
    """帮助创建符合Allure格式的测试结果文件"""
    
    def __init__(self, results_dir="./allure-results"):
        self.results_dir = os.path.abspath(results_dir)
        os.makedirs(self.results_dir, exist_ok=True)
        
        # 清空结果目录
        for file in os.listdir(self.results_dir):
            file_path = os.path.join(self.results_dir, file)
            if os.path.isfile(file_path):
                os.unlink(file_path)
    
    def create_test_result(self, name, status="passed", description=None, steps=None, attachments=None):
        """创建一个测试结果文件"""
        # 生成UUID
        test_uuid = str(uuid.uuid4())
        
        # 获取时间戳
        now = time.time() * 1000
        start_time = now - 10000  # 10秒前
        stop_time = now
        
        # 创建基本测试结果
        test_result = {
            "uuid": test_uuid,
            "historyId": str(uuid.uuid4()),
            "name": name,
            "fullName": f"vp_180.tests.{name}",
            "status": status,
            "statusDetails": {},
            "stage": "finished",
            "description": description or "",
            "descriptionHtml": description or "",
            "start": int(start_time),
            "stop": int(stop_time),
            "labels": [
                {"name": "host", "value": "localhost"},
                {"name": "thread", "value": "main"},
                {"name": "framework", "value": "unittest"},
                {"name": "language", "value": "python"},
                {"name": "epic", "value": "VP180自动化测试"},
                {"name": "feature", "value": "图像处理功能"}
            ],
            "links": [],
            "steps": steps or [],
            "attachments": attachments or []
        }
        
        # 创建容器
        container = {
            "uuid": str(uuid.uuid4()),
            "name": name,
            "children": [test_uuid],
            "befores": [],
            "afters": [],
            "start": int(start_time - 100),
            "stop": int(stop_time + 100)
        }
        
        # 保存测试结果
        result_file = os.path.join(self.results_dir, f"result-{test_uuid}.json")
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(test_result, f, ensure_ascii=False)
        
        # 保存容器
        container_file = os.path.join(self.results_dir, f"container-{uuid.uuid4()}.json")
        with open(container_file, 'w', encoding='utf-8') as f:
            json.dump(container, f, ensure_ascii=False)
        
        return test_uuid
    
    def add_attachment(self, test_uuid, name, content, attachment_type):
        """添加附件到测试结果"""
        attachment_uuid = str(uuid.uuid4())
        attachment_file = os.path.join(self.results_dir, f"{attachment_uuid}-attachment.{attachment_type}")
        
        # 保存附件内容
        with open(attachment_file, 'wb') as f:
            f.write(content)
        
        # 更新测试结果
        result_file = None
        for file in os.listdir(self.results_dir):
            if file.startswith(f"result-{test_uuid}"):
                result_file = os.path.join(self.results_dir, file)
                break
        
        if result_file:
            with open(result_file, 'r', encoding='utf-8') as f:
                test_result = json.load(f)
            
            # 添加附件信息
            test_result["attachments"].append({
                "name": name,
                "source": f"{attachment_uuid}-attachment.{attachment_type}",
                "type": attachment_type
            })
            
            # 保存更新后的测试结果
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(test_result, f, ensure_ascii=False)
    
    def create_environment_properties(self):
        """创建环境属性文件"""
        env_file = os.path.join(self.results_dir, "environment.properties")
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write("设备=VP180\n")
            f.write("操作系统=Linux\n")
            f.write(f"测试时间={datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    def create_categories_json(self):
        """创建分类文件"""
        categories = [
            {
                "name": "通过的测试",
                "matchedStatuses": ["passed"]
            },
            {
                "name": "失败的测试",
                "matchedStatuses": ["failed"]
            },
            {
                "name": "中断的测试",
                "matchedStatuses": ["broken"]
            },
            {
                "name": "跳过的测试",
                "matchedStatuses": ["skipped"]
            }
        ]
        
        categories_file = os.path.join(self.results_dir, "categories.json")
        with open(categories_file, 'w', encoding='utf-8') as f:
            json.dump(categories, f, ensure_ascii=False) 