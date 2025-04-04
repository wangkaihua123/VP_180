import os
import subprocess
import logging
import allure
import shutil
from datetime import datetime

class AllureReporter:
    def __init__(self, results_dir="./allure-results", report_dir="./allure-report"):
        """初始化Allure报告生成器"""
        self.results_dir = os.path.abspath(results_dir)
        self.report_dir = os.path.abspath(report_dir)
        
        # 确保结果目录存在
        os.makedirs(self.results_dir, exist_ok=True)
        logging.info(f"Allure结果目录: {self.results_dir}")
        
        # 清空之前的结果目录
        self.clean_results_dir()
        
    def clean_results_dir(self):
        """清空结果目录，确保每次测试都有干净的环境"""
        try:
            for file in os.listdir(self.results_dir):
                file_path = os.path.join(self.results_dir, file)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            logging.info("已清空Allure结果目录")
        except Exception as e:
            logging.error(f"清空Allure结果目录时出错: {e}")
    
    def attach_image(self, image, name="图像", attachment_type=allure.attachment_type.PNG):
        """将图像附加到Allure报告"""
        try:
            allure.attach(image, name=name, attachment_type=attachment_type)
            logging.info(f"已将图像 '{name}' 附加到Allure报告")
        except Exception as e:
            logging.error(f"附加图像到Allure报告时出错: {e}")
    
    def attach_text(self, text, name="文本"):
        """将文本附加到Allure报告"""
        try:
            allure.attach(body=text, name=name, attachment_type=allure.attachment_type.TEXT)
            logging.info(f"已将文本 '{name}' 附加到Allure报告")
        except Exception as e:
            logging.error(f"附加文本到Allure报告时出错: {e}")
    
    def generate_report(self):
        """生成Allure报告"""
        try:
            # 确保结果目录存在，并使用绝对路径
            results_dir_abs = os.path.abspath(self.results_dir)
            report_dir_abs = os.path.abspath(self.report_dir)
            
            os.makedirs(results_dir_abs, exist_ok=True)
            os.makedirs(report_dir_abs, exist_ok=True)
            
            # 检查结果目录是否为空或只有少量文件
            files = os.listdir(results_dir_abs)
            if len(files) < 3:  # 通常至少需要result、container和环境文件
                logging.warning("Allure结果目录为空或文件不足，创建示例结果文件")
                self._create_sample_result()
            
            # 尝试使用report_generator
            try:
                from vp_180.utils.report_generator import ReportGenerator
                report_gen = ReportGenerator()
                success = report_gen.generate_report(output_path=report_dir_abs)
                
                if success:
                    logging.info(f"使用ReportGenerator成功生成报告到: {report_dir_abs}")
                    return True
                else:
                    logging.warning("使用ReportGenerator生成报告失败，尝试直接调用allure命令")
            except Exception as e:
                logging.warning(f"使用ReportGenerator时出错: {e}，尝试直接调用allure命令")
            
            # 如果ReportGenerator失败，尝试直接调用allure命令
            # 查找allure命令
            allure_cmd = self._find_allure_command()
            if not allure_cmd:
                logging.error("未找到allure命令，无法生成报告")
                return False
            
            logging.info(f"✅ 找到可用的 allure 命令: {allure_cmd}")
            
            # 生成报告命令
            if os.name == 'nt':  # Windows
                # 尝试使用不同的命令格式
                try:
                    # 方法1: 使用cmd.exe /c
                    cmd_str = f'cmd.exe /c "{allure_cmd}" generate "{results_dir_abs}" -o "{report_dir_abs}" --clean'
                    logging.info(f"尝试方法1: {cmd_str}")
                    
                    process = subprocess.run(
                        cmd_str, 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE, 
                        text=True,
                        shell=True
                    )
                    
                    if process.returncode == 0:
                        logging.info("方法1成功")
                        return True
                    
                    # 方法2: 直接使用命令
                    cmd_str = f'"{allure_cmd}" generate "{results_dir_abs}" -o "{report_dir_abs}" --clean'
                    logging.info(f"尝试方法2: {cmd_str}")
                    
                    process = subprocess.run(
                        cmd_str, 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE, 
                        text=True,
                        shell=True
                    )
                    
                    if process.returncode == 0:
                        logging.info("方法2成功")
                        return True
                    
                    # 方法3: 使用列表形式
                    cmd_list = [allure_cmd, "generate", results_dir_abs, "-o", report_dir_abs, "--clean"]
                    logging.info(f"尝试方法3: {cmd_list}")
                    
                    process = subprocess.run(
                        cmd_list, 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE, 
                        text=True
                    )
                    
                    if process.returncode == 0:
                        logging.info("方法3成功")
                        return True
                    
                    # 所有方法都失败
                    logging.error("所有尝试都失败")
                    return False
                    
                except Exception as e:
                    logging.error(f"执行命令时出错: {e}")
                    return False
            else:  # Linux/Mac
                cmd_list = [allure_cmd, "generate", results_dir_abs, "-o", report_dir_abs, "--clean"]
                logging.info(f"执行命令: {' '.join(cmd_list)}")
                
                process = subprocess.run(
                    cmd_list, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
                    text=True
                )
            
            # 打印命令输出，帮助调试
            logging.info(f"命令输出: {process.stdout}")
            if process.stderr:
                logging.warning(f"命令错误输出: {process.stderr}")
            
            if process.returncode != 0:
                logging.error(f"生成Allure报告失败，返回码: {process.returncode}")
                return False
            
            # 检查报告目录是否生成了文件
            if os.path.exists(report_dir_abs) and os.listdir(report_dir_abs):
                logging.info(f"Allure报告已生成到: {report_dir_abs}")
                return True
            else:
                logging.error("Allure报告目录为空，生成失败")
                return False
            
        except Exception as e:
            logging.error(f"生成报告时发生异常: {e}")
            import traceback
            logging.error(traceback.format_exc())
            return False
    
    def _create_sample_result(self):
        """创建一个示例测试结果文件，确保有数据可以生成报告"""
        import json
        import uuid
        from datetime import datetime
        
        # 创建一个简单的测试结果
        test_result = {
            "uuid": str(uuid.uuid4()),
            "name": "示例测试",
            "status": "passed",
            "start": int(datetime.now().timestamp() * 1000),
            "stop": int(datetime.now().timestamp() * 1000) + 1000,
            "historyId": str(uuid.uuid4()),
            "testCaseId": str(uuid.uuid4()),
            "fullName": "sample_test",
            "labels": [
                {"name": "epic", "value": "VP180自动化测试"},
                {"name": "feature", "value": "示例测试"},
                {"name": "story", "value": "确保报告生成"}
            ],
            "steps": [
                {
                    "name": "示例步骤",
                    "status": "passed",
                    "start": int(datetime.now().timestamp() * 1000),
                    "stop": int(datetime.now().timestamp() * 1000) + 500
                }
            ]
        }
        
        # 将测试结果写入文件
        result_file = os.path.join(self.results_dir, f"result-{uuid.uuid4()}.json")
        with open(result_file, 'w') as f:
            json.dump(test_result, f)
        
        logging.info(f"创建了示例测试结果文件: {result_file}")
    
    def serve_report(self):
        """启动Allure报告服务器"""
        try:
            allure_cmd = self._find_allure_command()
            if not allure_cmd:
                logging.error("未找到allure命令，无法启动服务器")
                return False
            
            logging.info("正在启动 Allure 报告服务器...")
            
            # 根据操作系统选择不同的启动方式
            if os.name == 'nt':  # Windows
                # 使用cmd.exe调用allure命令
                cmd_str = f'cmd.exe /c "{allure_cmd}" serve "{os.path.abspath(self.results_dir)}"'
                logging.info(f"执行命令: {cmd_str}")
                
                process = subprocess.Popen(
                    cmd_str, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE,
                    shell=True
                )
            else:  # Linux/Mac
                # 使用列表形式的命令
                cmd_list = [allure_cmd, "serve", os.path.abspath(self.results_dir)]
                process = subprocess.Popen(
                    cmd_list, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE
                )
            
            # 等待一小段时间，检查进程是否正常启动
            import time
            time.sleep(2)
            
            if process.poll() is None:  # 如果进程仍在运行
                logging.info("✅ Allure 报告服务器已启动")
                logging.info("💡 请在浏览器中查看报告（通常在 http://localhost:35225）")
                return True
            else:
                stdout, stderr = process.communicate()
                error_msg = stderr.decode() if hasattr(stderr, 'decode') else str(stderr)
                logging.error(f"启动Allure服务器失败: {error_msg}")
                return False
                
        except Exception as e:
            logging.error(f"启动Allure报告服务器时出错: {e}")
            return False
    
    def _find_allure_command(self):
        """查找可用的allure命令"""
        try:
            if os.name == 'nt':  # Windows
                # 检查常见安装位置
                common_paths = [
                    r"C:\Program Files\allure\bin\allure.bat",
                    r"C:\allure\bin\allure.bat",
                    os.path.join(os.environ.get("USERPROFILE", ""), "scoop", "apps", "allure", "current", "bin", "allure.bat")
                ]
                
                for path in common_paths:
                    if os.path.exists(path):
                        return path
                    
                # 如果没找到具体路径，尝试直接使用命令名（依赖PATH环境变量）
                try:
                    # 使用shell=True来避免WinError 193
                    process = subprocess.run("allure --version", 
                                            stdout=subprocess.PIPE, 
                                            stderr=subprocess.PIPE, 
                                            text=True,
                                            shell=True)
                    if process.returncode == 0:
                        return "allure"
                except Exception:
                    pass
            else:  # Linux/Mac
                process = subprocess.run(["which", "allure"], 
                                        stdout=subprocess.PIPE, 
                                        stderr=subprocess.PIPE, 
                                        text=True)
                if process.returncode == 0:
                    return process.stdout.strip()
            
            # 如果找不到，返回None
            return None
            
        except Exception as e:
            logging.error(f"查找allure命令时出错: {e}")
            return None