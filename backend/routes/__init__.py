"""
路由模块包 - 包含所有API路由蓝图
"""
from flask import Blueprint

# 创建蓝图
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
ssh_bp = Blueprint('ssh', __name__, url_prefix='/api/ssh')
serial_bp = Blueprint('serial', __name__, url_prefix='/api/serial')
test_cases_bp = Blueprint('test_cases', __name__, url_prefix='/api/test-cases')
files_bp = Blueprint('files', __name__, url_prefix='/api/files')

# 导入路由处理模块
from . import auth
from . import ssh
from . import serial
from . import test_cases
from . import files

# 定义蓝图列表，用于在app.py中注册
blueprints = [
    auth_bp,
    ssh_bp,
    serial_bp,
    test_cases_bp,
    files_bp
] 