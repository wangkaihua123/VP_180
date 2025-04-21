from dotenv import load_dotenv
load_dotenv()

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, request, session, send_from_directory
from flask_cors import CORS
import json
from datetime import datetime
import random
import paramiko
import socket
import logging
from utils.test_case_executor import TestCaseExecutor
from utils.ssh_manager import SSHManager

app = Flask(__name__)
app.secret_key = 'youyi_medical_test_platform_secret_key'
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
TEST_CASES_FILE = os.path.join(DATA_DIR, 'test_cases.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')

# 加载测试用例数据
def load_test_cases():
    try:
        if os.path.exists(TEST_CASES_FILE):
            with open(TEST_CASES_FILE, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:  # 如果文件不为空
                    data = json.loads(content)
                    # 转换字段名
                    converted_data = []
                    for test_case in data:
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
                        converted_data.append(converted_case)
                    print(f"成功从文件加载测试用例: {TEST_CASES_FILE}")
                    return converted_data
                else:
                    print(f"测试用例文件为空，使用默认数据")
        else:
            print(f"测试用例文件不存在，使用默认数据")
        
        # 使用默认数据
        return [
            {
                'id': 1,
                'title': '登录界面测试',
                'type': '功能测试',
                'status': '未运行',
                'create_time': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'description': '测试登录界面的表单验证和提交功能',
                'script_content': json.dumps({
                    'repeatCount': 1,
                    'operationSteps': [
                        {
                            'id': 1,
                            'operation_key': '获取图像',
                            'button_name': '',
                            'x1': 0,
                            'y1': 0,
                            'x2': 0,
                            'y2': 0
                        }
                    ],
                    'verificationSteps': [
                        {
                            'id': 1,
                            'verification_key': '对比图像相似度',
                            'img1': '1',
                            'img2': '1'
                        }
                    ]
                }, ensure_ascii=False)
            }
        ]
    except Exception as e:
        print(f"加载测试用例数据出错: {e}")
        print(f"文件路径: {TEST_CASES_FILE}")
        return []

# 保存测试用例数据
def save_test_cases(test_cases):
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(TEST_CASES_FILE), exist_ok=True)
        
        # 转换字段名
        converted_test_cases = []
        for test_case in test_cases:
            converted_case = test_case.copy()
            if 'script_content' in test_case:
                try:
                    content = json.loads(test_case['script_content'])
                    if 'operationSteps' in content:
                        content['operationSteps'] = [
                            {
                                **step,
                                'operation_key': step.get('operation_type', ''),
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
                                'verification_key': step.get('verification_type', ''),
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
            converted_test_cases.append(converted_case)
        
        # 保存数据
        with open(TEST_CASES_FILE, 'w', encoding='utf-8') as f:
            json.dump(converted_test_cases, f, ensure_ascii=False, indent=2)
            
        print(f"成功保存测试用例到文件: {TEST_CASES_FILE}")
        print(f"保存的数据: {json.dumps(converted_test_cases, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"保存测试用例数据出错: {e}")
        print(f"尝试保存到路径: {TEST_CASES_FILE}")
        return False

# 加载设置数据
def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载设置数据出错: {e}")
    return {"ssh_host": "", "ssh_port": 22, "ssh_username": "", "ssh_password": ""}

# 保存设置数据
def save_settings(settings):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

# SSH 连接测试
@app.route('/api/ssh/test', methods=['POST'])
def test_ssh_connection():
    data = request.get_json()
    host = data.get('ssh_host')
    port = int(data.get('ssh_port', 22))
    username = data.get('ssh_username')
    password = data.get('ssh_password')

    print(f"尝试连接 SSH: {host}:{port} with user {username}")

    try:
        # 设置 paramiko 日志
        logging.basicConfig()
        logging.getLogger("paramiko").setLevel(logging.DEBUG)
        paramiko.util.log_to_file("ssh_detailed.log")

        # 创建传输层
        print("创建 SSH 传输层...")
        transport = paramiko.Transport((host, port))
        transport.set_log_channel("paramiko")
        transport.set_hexdump(True)  # 启用十六进制数据dump

        print("开始 SSH 传输连接...")
        transport.start_client()

        print("尝试密码认证...")
        transport.auth_password(username, password)

        if transport.is_authenticated():
            print("认证成功，创建 SSH 会话...")
            # 创建 SSH 会话
            ssh = paramiko.SSHClient()
            ssh._transport = transport
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            print("执行测试命令...")
            # 测试执行简单命令
            stdin, stdout, stderr = ssh.exec_command('echo "Test connection successful"', timeout=5)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if error:
                print(f"命令执行出现错误: {error}")
                raise Exception(f"命令执行错误: {error}")

            print(f"命令执行成功，输出: {output}")

            # 关闭连接
            ssh.close()
            transport.close()

            return jsonify({
                'success': True,
                'message': '连接成功',
                'output': output
            })
        else:
            print("认证失败")
            raise paramiko.AuthenticationException("认证失败")

    except socket.timeout:
        print(f"连接超时: {host}:{port}")
        return jsonify({
            'success': False,
            'message': '连接超时，请检查主机地址和端口是否正确'
        }), 400
    except paramiko.AuthenticationException as e:
        print(f"认证失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': '认证失败，请检查用户名和密码是否正确'
        }), 401
    except paramiko.SSHException as e:
        print(f"SSH 异常: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'SSH 连接错误: {str(e)}'
        }), 500
    except Exception as e:
        print(f"未知错误: {str(e)}")
        print(f"错误类型: {type(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'连接失败: {str(e)}'
        }), 500

# SSH 设置路由
@app.route('/api/ssh/settings', methods=['GET'])
def get_ssh_settings():
    settings = load_settings()
    # 隐藏密码
    if 'ssh_password' in settings:
        settings['ssh_password'] = ''
    return jsonify(settings)

@app.route('/api/ssh/settings', methods=['PUT'])
def update_ssh_settings():
    data = request.get_json()
    settings = load_settings()

    # 更新设置
    for key in ['ssh_host', 'ssh_port', 'ssh_username']:
        if key in data:
            settings[key] = data[key]

    # 仅当密码不为空时更新密码
    if 'ssh_password' in data and data['ssh_password']:
        settings['ssh_password'] = data['ssh_password']

    save_settings(settings)
    return jsonify({
        'success': True,
        'message': '设置已更新'
    })

# 初始化测试用例数据
TEST_CASES = load_test_cases() or [
    {
        'id': 1,
        'title': '登录界面测试',
        'type': '功能测试',
        'status': '通过',
        'create_time': '2023-10-15 10:30',
        'description': '测试登录界面的表单验证和提交功能',
        'script_content': 'def test_login():\n    # 输入用户名和密码\n    input_username("admin")\n    input_password("password")\n    click_login_button()\n    \n    # 验证登录成功\n    assert_element_visible("welcome_message")'
    },
    {
        'id': 2,
        'title': '首页加载性能测试',
        'type': '性能测试',
        'status': '警告',
        'create_time': '2023-10-16 14:20',
        'description': '测试首页加载速度和资源占用情况',
        'script_content': 'def test_home_performance():\n    # 测量页面加载时间\n    start_timer()\n    navigate_to_home()\n    load_time = stop_timer()\n    \n    # 验证加载时间小于3秒\n    assert load_time < 3.0'
    },
    {
        'id': 3,
        'title': '患者列表查询测试',
        'type': '功能测试',
        'status': '失败',
        'create_time': '2023-10-17 09:45',
        'description': '测试患者列表的搜索和筛选功能',
        'script_content': 'def test_patient_search():\n    # 搜索患者\n    input_search_term("张三")\n    click_search_button()\n    \n    # 验证结果包含搜索的患者\n    assert_text_present("张三")'
    }
]

# 用户认证路由
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # 简单的验证
    if username == 'admin' and password == 'admin':
        session['logged_in'] = True
        session['username'] = username
        return jsonify({'success': True, 'message': '登录成功'})
    
    return jsonify({'success': False, 'message': '用户名或密码错误'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    return jsonify({'success': True, 'message': '已成功退出'})

# 设置路由
@app.route('/api/settings', methods=['GET', 'PUT'])
def manage_settings():
    if request.method == 'GET':
        settings = load_settings()
        # 隐藏密码
        if 'ssh_password' in settings:
            settings['ssh_password'] = ''
        return jsonify({'success': True, 'settings': settings})
    
    elif request.method == 'PUT':
        data = request.get_json()
        settings = load_settings()
        
        # 更新设置
        for key in ['ssh_host', 'ssh_port', 'ssh_username']:
            if key in data:
                settings[key] = data[key]
        
        # 仅当密码不为空时更新密码
        if 'ssh_password' in data and data['ssh_password']:
            settings['ssh_password'] = data['ssh_password']
        
        save_settings(settings)
        return jsonify({'success': True, 'message': '设置已更新'})

# 测试用例路由
@app.route('/api/test-cases', methods=['GET', 'POST'])
def test_cases():
    global TEST_CASES
    
    if request.method == 'GET':
        # 每次获取时重新加载数据
        TEST_CASES = load_test_cases()
        return jsonify({'success': True, 'test_cases': TEST_CASES})
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            print(f"收到创建测试用例请求: {json.dumps(data, ensure_ascii=False)}")  # 添加日志
            
            TEST_CASES = load_test_cases()  # 重新加载最新数据
            
            new_id = max([case['id'] for case in TEST_CASES]) + 1 if TEST_CASES else 1
            
            new_case = {
                'id': new_id,
                'title': data.get('title', ''),
                'type': data.get('type', '功能测试'),
                'status': '未运行',
                'create_time': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'description': data.get('description', ''),
                'script_content': data.get('script_content', '')
            }
            
            print(f"准备保存新测试用例: {json.dumps(new_case, ensure_ascii=False)}")  # 添加日志
            
            TEST_CASES.append(new_case)
            if save_test_cases(TEST_CASES):
                print("测试用例保存成功")  # 添加日志
                return jsonify({'success': True, 'test_case': new_case}), 201
            else:
                print("测试用例保存失败")  # 添加日志
                return jsonify({'success': False, 'message': '保存测试用例失败'}), 500
        except Exception as e:
            print(f"创建测试用例时发生错误: {str(e)}")  # 添加日志
            return jsonify({'success': False, 'message': f'创建测试用例失败: {str(e)}'}), 500

@app.route('/api/test-cases/<int:case_id>', methods=['GET', 'PUT', 'DELETE'])
def test_case(case_id):
    global TEST_CASES
    TEST_CASES = load_test_cases()  # 重新加载最新数据
    
    case = next((case for case in TEST_CASES if case['id'] == case_id), None)
    
    if not case:
        return jsonify({'success': False, 'message': '测试用例不存在'}), 404
    
    if request.method == 'GET':
        return jsonify({'success': True, 'test_case': case})
    
    elif request.method == 'PUT':
        data = request.get_json()
        case['title'] = data.get('title', case['title'])
        case['type'] = data.get('type', case['type'])
        case['description'] = data.get('description', case['description'])
        case['script_content'] = data.get('script_content', case['script_content'])
        
        if save_test_cases(TEST_CASES):
            return jsonify({'success': True, 'test_case': case})
        else:
            return jsonify({'success': False, 'message': '保存测试用例失败'}), 500
    
    elif request.method == 'DELETE':
        TEST_CASES.remove(case)
        if save_test_cases(TEST_CASES):
            return jsonify({'success': True, 'message': '测试用例已删除'})
        else:
            return jsonify({'success': False, 'message': '删除测试用例失败'}), 500

@app.route('/api/test-cases/<int:case_id>/run', methods=['POST'])
def run_test_case(case_id):
    try:
        case = next((case for case in TEST_CASES if case['id'] == case_id), None)
        
        if not case:
            return jsonify({'success': False, 'message': '测试用例不存在'}), 404
        
        # 获取SSH连接
        ssh_manager = SSHManager()
        ssh = ssh_manager.get_client()
        
        if not ssh:
            return jsonify({'success': False, 'message': 'SSH连接失败'}), 500
        
        # 执行测试用例
        executor = TestCaseExecutor(ssh)
        result = executor.execute_test_case(case)
        
        # 更新测试用例状态
        case['status'] = result['status']
        case['create_time'] = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        # 保存更新后的测试用例
        save_test_cases(TEST_CASES)
        
        return jsonify({
            'success': True,
            'message': '测试已执行',
            'status': result['status'],
            'details': result
        })
        
    except Exception as e:
        app.logger.error(f"执行测试用例时出错: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'执行测试用例失败: {str(e)}'
        }), 500

@app.route('/api/test-cases/run-all', methods=['POST'])
def run_all_test_cases():
    try:
        # 获取SSH连接
        ssh_manager = SSHManager()
        ssh = ssh_manager.get_client()
        
        if not ssh:
            return jsonify({'success': False, 'message': 'SSH连接失败'}), 500
        
        # 执行所有测试用例
        executor = TestCaseExecutor(ssh)
        results = []
        
        for case in TEST_CASES:
            result = executor.execute_test_case(case)
            case['status'] = result['status']
            case['create_time'] = datetime.now().strftime('%Y-%m-%d %H:%M')
            results.append({
                'id': case['id'],
                'title': case['title'],
                'status': result['status'],
                'details': result
            })
        
        # 保存更新后的测试用例
        save_test_cases(TEST_CASES)
        
        return jsonify({
            'success': True,
            'message': '所有测试已执行',
            'results': results
        })
        
    except Exception as e:
        app.logger.error(f"执行所有测试用例时出错: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'执行测试用例失败: {str(e)}'
        }), 500

@app.route('/api/method-mappings', methods=['GET'])
def get_method_mappings():
    # 返回方法映射数据
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
    
    return jsonify({'success': True, 'method_mappings': method_mappings})

@app.route('/api/test-cases/<int:id>/latest-log', methods=['GET'])
def get_latest_log(id):
    try:
        # 获取测试用例的最新日志
        log_dir = os.path.join(app.root_path, 'logs', str(id))
        log_content = ""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 获取截图
        screenshots_dir = os.path.join(os.path.dirname(os.path.dirname(app.root_path)), 'screenshots')
        screenshots = []
        if os.path.exists(screenshots_dir):
            screenshot_files = [f for f in os.listdir(screenshots_dir) if f.endswith(('.png', '.jpg', '.jpeg', '.tiff'))]
            for file in screenshot_files:
                screenshots.append(f'/api/files/screenshots/{file}')

        # 获取图片
        images_dir = os.path.join(os.path.dirname(os.path.dirname(app.root_path)), 'img')
        images = []
        if os.path.exists(images_dir):
            image_files = [f for f in os.listdir(images_dir) if f.endswith(('.png', '.jpg', '.jpeg', '.tiff'))]
            for file in image_files:
                images.append(f'/api/files/images/{file}')

        return jsonify({
            'log_content': log_content,
            'images': images,
            'screenshots': screenshots,
            'timestamp': timestamp
        })

    except Exception as e:
        app.logger.error(f"Error getting latest log for test case {id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# 添加静态文件路由
@app.route('/api/files/images/<path:filename>')
def serve_image(filename):
    images_dir = os.path.join(os.path.dirname(os.path.dirname(app.root_path)), 'img')
    return send_from_directory(images_dir, filename)

@app.route('/api/files/screenshots/<path:filename>')
def serve_screenshot(filename):
    screenshots_dir = os.path.join(os.path.dirname(os.path.dirname(app.root_path)), 'screenshots')
    return send_from_directory(screenshots_dir, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 