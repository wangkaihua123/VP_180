"""
测试用例相关路由 - 处理测试用例的CRUD和执行
"""
from flask import Blueprint, request, jsonify
from backend.services.test_case_service import TestCaseService
import os
import json
import logging
from datetime import datetime

# 定义数据目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')

# 创建蓝图
test_cases_bp = Blueprint('test_cases', __name__)
test_case_service = TestCaseService()

@test_cases_bp.route('/api/test-cases', methods=['GET'])
def get_test_cases():
    """获取所有测试用例"""
    test_cases = TestCaseService.get_all()
    return jsonify({
        'success': True,
        'test_cases': test_cases
    })

@test_cases_bp.route('/api/test-cases', methods=['POST'])
def create_test_case():
    """创建新测试用例"""
    data = request.get_json()
    new_case = TestCaseService.create(data)
    
    if new_case:
        return jsonify({
            'success': True,
            'test_case': new_case,
            'message': '测试用例创建成功'
        }), 201
    else:
        return jsonify({
            'success': False,
            'message': '创建测试用例失败'
        }), 500

@test_cases_bp.route('/api/test-cases/<int:case_id>', methods=['GET'])
def get_test_case(case_id):
    """获取单个测试用例"""
    case = TestCaseService.get_by_id(case_id)
    
    if case:
        return jsonify({
            'success': True,
            'test_case': case
        })
    else:
        return jsonify({
            'success': False,
            'message': '测试用例不存在'
        }), 404

@test_cases_bp.route('/api/test-cases/<int:case_id>', methods=['PUT'])
def update_test_case(case_id):
    """更新测试用例"""
    data = request.get_json()
    updated_case = TestCaseService.update(case_id, data)
    
    if updated_case:
        return jsonify({
            'success': True,
            'test_case': updated_case,
            'message': '测试用例更新成功'
        })
    else:
        return jsonify({
            'success': False,
            'message': '更新测试用例失败'
        }), 500

@test_cases_bp.route('/api/test-cases/<int:case_id>', methods=['DELETE'])
def delete_test_case(case_id):
    """删除测试用例"""
    if TestCaseService.delete(case_id):
        return jsonify({
            'success': True,
            'message': '测试用例已删除'
        })
    else:
        return jsonify({
            'success': False,
            'message': '删除测试用例失败'
        }), 500

@test_cases_bp.route('/api/test-cases/<int:case_id>/run', methods=['POST'])
def run_test_case(case_id):
    """执行单个测试用例"""
    result = TestCaseService.run(case_id)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 500

@test_cases_bp.route('/api/test-cases/batch/run', methods=['POST'])
def run_batch_test_cases():
    """批量执行测试用例"""
    data = request.get_json()
    case_ids = data.get('ids', [])
    
    result = TestCaseService.run_batch(case_ids)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 500

@test_cases_bp.route('/api/test-cases/run-all', methods=['POST'])
def run_all_test_cases():
    """执行所有测试用例"""
    result = TestCaseService.run_all()
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 500

@test_cases_bp.route('/api/test-cases/<int:case_id>/latest-log', methods=['GET'])
def get_latest_log(case_id):
    """获取测试用例的最新日志"""
    result = TestCaseService.get_latest_log(case_id)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 500

@test_cases_bp.route('/api/method-mappings', methods=['GET'])
def get_method_mappings():
    """获取方法映射"""
    method_mappings = TestCaseService.get_method_mappings()
    
    return jsonify({
        'success': True,
        'method_mappings': method_mappings
    })

@test_cases_bp.route('/api/test-cases/<int:test_case_id>/status', methods=['PUT'])
def update_test_case_status(test_case_id):
    """
    更新测试用例的状态
    
    请求参数:
    - status: 要更新的状态值（通过、失败等）
    
    返回:
    - 成功/失败信息
    """
    try:
        # 检查请求数据
        if not request.is_json:
            return jsonify({'success': False, 'message': '请求数据必须为JSON格式'}), 400
        
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({'success': False, 'message': '缺少状态参数'}), 400
        
        # 读取测试用例数据
        test_cases_file = os.path.join(DATA_DIR, 'test_cases.json')
        if not os.path.exists(test_cases_file):
            return jsonify({'success': False, 'message': '测试用例数据文件不存在'}), 404
            
        with open(test_cases_file, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
        
        # 查找并更新指定测试用例
        for test_case in test_cases:
            if test_case['id'] == test_case_id:
                test_case['status'] = status
                # 添加最后执行时间
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                test_case['last_execution_time'] = current_time
                # 保存更新后的数据
                with open(test_cases_file, 'w', encoding='utf-8') as f:
                    json.dump(test_cases, f, ensure_ascii=False, indent=2)
                return jsonify({'success': True, 'message': '测试用例状态已更新'})
        
        return jsonify({'success': False, 'message': f'未找到ID为{test_case_id}的测试用例'}), 404
        
    except Exception as e:
        logging.error(f"更新测试用例状态时出错: {str(e)}")
        return jsonify({'success': False, 'message': f'更新测试用例状态失败: {str(e)}'}), 500 