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
settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')
reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')
# 从logs.py中导入logs_bp，而不是在这里创建
# logs_bp = Blueprint('logs', __name__, url_prefix='/api/logs')

# 实现蓝图，但在这里导入而不是在顶部导入
# 这样可以避免循环导入的问题
from routes import auth
from routes import ssh
from routes import serial
from routes import test_cases
from routes import files
from routes import logs  # 添加logs模块的导入
from routes import screen  # 添加screen模块的导入
from routes import settings  # 添加settings模块的导入
from routes import reports  # 添加reports模块的导入

# 所有蓝图
from .logs import logs_bp  # 显式导入logs_bp
from .screen import screen_bp  # 显式导入screen_bp
from .settings import settings_bp  # 显式导入settings_bp
from .reports import reports_bp  # 显式导入reports_bp
__all__ = ['auth_bp', 'ssh_bp', 'serial_bp', 'test_cases_bp', 'files_bp', 'logs_bp', 'screen_bp', 'settings_bp', 'reports_bp']