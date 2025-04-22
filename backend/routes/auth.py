"""
认证相关路由 - 处理用户登录和登出
"""
from flask import Blueprint, request, jsonify, session
from backend.services.auth_service import AuthService

# 创建蓝图
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    result = AuthService.login(username, password)
    
    if result['success']:
        # 设置会话
        session['logged_in'] = True
        session['username'] = username
        return jsonify(result)
    else:
        return jsonify(result), 401

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    """用户登出"""
    username = session.get('username', '')
    
    # 清除会话
    session.pop('logged_in', None)
    session.pop('username', None)
    
    result = AuthService.logout(username)
    return jsonify(result) 