"""
文件服务相关路由 - 处理图片和截图文件的访问
"""
from flask import Blueprint, send_from_directory
from backend.config import IMAGES_DIR, SCREENSHOTS_DIR

# 创建蓝图
files_bp = Blueprint('files', __name__)

@files_bp.route('/api/files/images/<path:filename>')
def serve_image(filename):
    """提供图片文件服务"""
    return send_from_directory(IMAGES_DIR, filename)

@files_bp.route('/api/files/screenshots/<path:filename>')
def serve_screenshot(filename):
    """提供截图文件服务"""
    return send_from_directory(SCREENSHOTS_DIR, filename) 