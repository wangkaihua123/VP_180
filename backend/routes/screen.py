from flask import Blueprint, jsonify, request
import cv2
import os
import logging
from utils.get_latest_image import GetLatestImage
from utils.ssh_manager import SSHManager

# 创建蓝图
screen_bp = Blueprint('screen', __name__)
logger = logging.getLogger(__name__)

@screen_bp.route('/api/screen/capture', methods=['GET'])
def capture_screen():
    """
    通过SSH连接获取设备操作界面截图
    
    Returns:
        JSON: 包含Base64编码的截图数据
    """
    try:
        # 获取测试用例ID和文件名参数
        test_case_id = request.args.get('testCaseId')
        file_name = request.args.get('fileName')
        logger.info(f"接收到操作界面截图请求，测试用例ID: {test_case_id or '无'}, 文件名: {file_name or '无'}")
        
        # 获取SSH连接
        ssh_connection = SSHManager.get_client()
        
        if not ssh_connection:
            logger.error("无法获取SSH连接")
            return jsonify({
                'success': False,
                'error': '无法通过SSH连接到设备，请检查SSH连接设置'
            }), 500
        
        # 创建GetLatestImage实例
        image_getter = GetLatestImage(ssh_connection)
        
        # 获取操作界面截图，传入自定义文件名
        logger.info("正在通过SSH连接获取操作界面截图...")
        image = image_getter.get_screen_capture(id=test_case_id, filename=file_name)
        
        if image is None:
            logger.error("通过SSH连接获取操作界面截图失败")
            return jsonify({
                'success': False,
                'error': '通过SSH连接获取操作界面截图失败'
            }), 500
        
        # 直接保存图片文件到前端public目录
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'public', 'img', 'upload')
        os.makedirs(upload_dir, exist_ok=True)

        # 构建完整的文件路径
        file_path = os.path.join(upload_dir, file_name)

        # 如果文件已存在，先删除
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"删除已存在的截图文件: {file_path}")

        # 保存图片文件
        cv2.imwrite(file_path, image)
        logger.info(f"通过SSH连接获取的操作界面截图保存成功: {file_path}")

        # 构建访问URL
        file_url = f'/img/upload/{file_name}'

        return jsonify({
            'success': True,
            'filename': file_name,
            'file_url': file_url,
            'file_path': file_path,
            'testCaseId': test_case_id,
            'connection_type': 'SSH连接'
        })
        
    except Exception as e:
        logger.exception(f"通过SSH连接获取操作界面截图时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'通过SSH连接获取操作界面截图时出错: {str(e)}'
        }), 500