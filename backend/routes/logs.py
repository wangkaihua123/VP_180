import os
from flask import Blueprint, jsonify, current_app
from flask_cors import cross_origin

# 创建Blueprint
logs_bp = Blueprint('logs', __name__, url_prefix='/api/logs')

@logs_bp.route('/vp180', methods=['GET'])
@cross_origin()
def get_vp180_log():
    """获取VP_180.log日志文件内容"""
    try:
        log_file_path = os.path.join(current_app.config['DATA_DIR'], 'logs', 'VP_180.log')
        
        if not os.path.exists(log_file_path):
            return jsonify({
                'success': False,
                'message': "日志文件不存在",
                'data': []
            }), 404
            
        with open(log_file_path, 'r', encoding='utf-8') as file:
            log_lines = file.readlines()
            
        # 处理日志行，解析日期、级别等信息
        parsed_logs = []
        for line in log_lines:
            line = line.strip()
            if not line:
                continue
                
            # 尝试解析日志格式: 2025-04-23 16:55:33 - INFO - utils.button_clicker - 成功加载FUNCTIONS配置
            parts = line.split(' - ', 3)
            if len(parts) >= 4:
                timestamp, level, source, message = parts
                parsed_logs.append({
                    'timestamp': timestamp,
                    'level': level,
                    'source': source,
                    'message': message
                })
            else:
                # 如果格式不匹配，直接将整行作为消息
                parsed_logs.append({
                    'timestamp': '',
                    'level': 'UNKNOWN',
                    'source': '',
                    'message': line
                })
                
        return jsonify({
            'success': True,
            'message': "成功获取日志数据",
            'data': parsed_logs
        })
        
    except Exception as e:
        current_app.logger.error(f"获取VP_180.log文件时出错: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"获取日志数据失败: {str(e)}",
            'data': []
        }), 500 