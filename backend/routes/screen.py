from flask import Blueprint, jsonify, request
import base64
import cv2
import numpy as np
import os
import logging
from datetime import datetime
from utils.get_latest_image import GetLatestImage
from utils.ssh_manager import SSHManager

# 创建蓝图
screen_bp = Blueprint('screen', __name__)
logger = logging.getLogger(__name__)

@screen_bp.route('/api/screen/capture', methods=['GET'])
def capture_screen():
    """
    获取设备操作界面截图
    
    Returns:
        JSON: 包含Base64编码的截图数据
    """
    try:
        # 获取测试用例ID
        test_case_id = request.args.get('testCaseId')
        logger.info(f"接收到操作界面截图请求，测试用例ID: {test_case_id or '无'}")
        
        # 获取SSH连接
        ssh_manager = SSHManager()
        ssh_connection = ssh_manager.get_client()
        
        if not ssh_connection:
            logger.error("无法获取SSH连接")
            return jsonify({
                'success': False,
                'error': '无法连接到设备，请检查SSH设置'
            }), 500
        
        # 创建GetLatestImage实例
        image_getter = GetLatestImage(ssh_connection)
        
        # 获取操作界面截图
        logger.info("正在获取操作界面截图...")
        image = image_getter.get_screen_capture(id=test_case_id)
        
        if image is None:
            logger.error("获取操作界面截图失败")
            return jsonify({
                'success': False,
                'error': '获取操作界面截图失败'
            }), 500
        
        # 将图像编码为Base64
        _, buffer = cv2.imencode('.png', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info("操作界面截图获取成功")
        return jsonify({
            'success': True,
            'imageBase64': image_base64,
            'testCaseId': test_case_id
        })
        
    except Exception as e:
        logger.exception(f"获取操作界面截图时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取操作界面截图时出错: {str(e)}'
        }), 500 