"""
测试报告相关路由 - 处理测试报告的保存和获取
"""
import os
import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin

# 设置日志
logger = logging.getLogger(__name__)

# 创建Blueprint
reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/save', methods=['POST'])
@cross_origin()
def save_report():
    """保存测试报告数据到report.json文件"""
    try:
        # 获取请求数据
        if not request.is_json:
            return jsonify({
                'success': False,
                'message': '请求数据必须为JSON格式'
            }), 400
        
        report_data = request.get_json()
        if not report_data:
            return jsonify({
                'success': False,
                'message': '缺少报告数据'
            }), 400
        
        # 添加生成时间戳
        report_data['generatedAt'] = datetime.now().isoformat()
        
        # 构建报告文件路径
        data_dir = getattr(current_app.config, 'DATA_DIR', 
                          os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data'))
        report_file = os.path.join(data_dir, 'report.json')
        
        # 确保目录存在
        os.makedirs(os.path.dirname(report_file), exist_ok=True)
        
        # 保存报告数据
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"测试报告已保存到: {report_file}")
        
        return jsonify({
            'success': True,
            'message': '测试报告保存成功',
            'file_path': report_file,
            'generated_at': report_data['generatedAt']
        })
        
    except Exception as e:
        logger.error(f"保存测试报告失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'保存测试报告失败: {str(e)}'
        }), 500

@reports_bp.route('/latest', methods=['GET'])
@cross_origin()
def get_latest_report():
    """获取最新的测试报告数据"""
    try:
        # 构建报告文件路径
        data_dir = getattr(current_app.config, 'DATA_DIR', 
                          os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data'))
        report_file = os.path.join(data_dir, 'report.json')
        
        if not os.path.exists(report_file):
            return jsonify({
                'success': False,
                'message': '报告文件不存在'
            }), 404
        
        # 读取报告数据
        with open(report_file, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
        
        logger.info(f"成功读取测试报告: {report_file}")
        
        return jsonify({
            'success': True,
            'data': report_data
        })
        
    except Exception as e:
        logger.error(f"读取测试报告失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'读取测试报告失败: {str(e)}'
        }), 500

@reports_bp.route('/list', methods=['GET'])
@cross_origin()
def list_reports():
    """获取所有测试报告列表（如果有多个报告文件）"""
    try:
        # 构建报告目录路径
        data_dir = getattr(current_app.config, 'DATA_DIR', 
                          os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data'))
        
        reports = []
        
        # 检查主报告文件
        report_file = os.path.join(data_dir, 'report.json')
        if os.path.exists(report_file):
            try:
                with open(report_file, 'r', encoding='utf-8') as f:
                    report_data = json.load(f)
                
                reports.append({
                    'filename': 'report.json',
                    'path': report_file,
                    'generated_at': report_data.get('generatedAt', ''),
                    'project': report_data.get('project', ''),
                    'date': report_data.get('date', ''),
                    'total_cases': report_data.get('totalCases', 0),
                    'pass_rate': report_data.get('passRate', 0)
                })
            except Exception as e:
                logger.warning(f"读取报告文件失败: {report_file}, 错误: {str(e)}")
        
        return jsonify({
            'success': True,
            'data': reports,
            'count': len(reports)
        })
        
    except Exception as e:
        logger.error(f"获取报告列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取报告列表失败: {str(e)}'
        }), 500
