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
screen_bp = Blueprint('screen', __name__, url_prefix='/api/screen')
# 从logs.py中导入logs_bp，而不是在这里创建
# logs_bp = Blueprint('logs', __name__, url_prefix='/api/logs')

# 实现蓝图，但在这里导入而不是在顶部导入
# 这样可以避免循环导入的问题
from backend.routes import auth
from backend.routes import ssh
from backend.routes import serial
from backend.routes import test_cases
from backend.routes import files
from backend.routes import logs  # 添加logs模块的导入
from backend.routes import screen  # 添加screen模块的导入

# 所有蓝图
from .logs import logs_bp  # 显式导入logs_bp
from .screen import screen_bp  # 显式导入screen_bp
__all__ = ['auth_bp', 'ssh_bp', 'serial_bp', 'test_cases_bp', 'files_bp', 'logs_bp', 'screen_bp'] 