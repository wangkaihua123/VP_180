"""
文件服务相关路由 - 处理图片和截图文件的访问
"""
import os
import shutil
import logging
from flask import send_from_directory, jsonify, request
from backend.config import IMAGES_DIR, SCREENSHOTS_DIR, OPERATION_IMAGES_DIR, DISPLAY_IMAGES_DIR

# 设置日志
logger = logging.getLogger(__name__)

# 从__init__.py导入蓝图
from . import files_bp

@files_bp.route('/images/<path:filename>')
def serve_image(filename):
    """提供图片文件服务"""
    return send_from_directory(IMAGES_DIR, filename)

@files_bp.route('/operation_img/<path:filename>')
def serve_operation_image(filename):
    """提供操作图片文件服务"""
    return send_from_directory(OPERATION_IMAGES_DIR, filename)

@files_bp.route('/display_img/<path:filename>')
def serve_display_image(filename):
    """提供显示图片文件服务"""
    return send_from_directory(DISPLAY_IMAGES_DIR, filename)

@files_bp.route('/screenshots/<path:filename>')
def serve_screenshot(filename):
    """提供截图文件服务"""
    return send_from_directory(SCREENSHOTS_DIR, filename)

@files_bp.route('/images/list')
def list_images():
    """获取图片文件列表"""
    try:
        test_case_id = request.args.get('testCaseId')

        # 定义要扫描的目录
        dirs_to_scan = [
            ('root', IMAGES_DIR),
            ('operation_img', OPERATION_IMAGES_DIR),
            ('display_img', DISPLAY_IMAGES_DIR)
        ]

        all_files = []

        for subdir_name, dir_path in dirs_to_scan:
            if not os.path.exists(dir_path):
                continue

            try:
                files = os.listdir(dir_path)
                # 只保留图像文件
                image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif'))]

                # 如果指定了测试用例ID，过滤匹配的文件
                if test_case_id:
                    image_files = [f for f in image_files if f.startswith(f'id_{test_case_id}_') or f.startswith(f'{test_case_id}_')]

                # 构建文件详情
                for filename in image_files:
                    file_path = os.path.join(dir_path, filename)
                    try:
                        stat = os.stat(file_path)

                        # 构建API路径
                        if subdir_name == 'root':
                            api_path = f'/api/files/images/{filename}'
                        elif subdir_name == 'operation_img':
                            api_path = f'/api/files/operation_img/{filename}'
                        elif subdir_name == 'display_img':
                            api_path = f'/api/files/display_img/{filename}'

                        all_files.append({
                            'name': filename,
                            'path': api_path,
                            'size': stat.st_size,
                            'lastModified': stat.st_mtime,
                            'subDir': subdir_name
                        })
                    except OSError:
                        continue

            except OSError:
                continue

        return jsonify({
            'success': True,
            'images': [f['name'] for f in all_files],
            'imageDetails': all_files,
            'testCaseId': test_case_id,
            'timestamp': None
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': '获取图片列表失败',
            'details': str(e),
            'images': []
        }), 500

@files_bp.route('/screenshots/list')
def list_screenshots():
    """获取截图文件列表"""
    try:
        test_case_id = request.args.get('testCaseId')

        if not os.path.exists(SCREENSHOTS_DIR):
            return jsonify({
                'success': True,
                'screenshots': [],
                'screenshotDetails': [],
                'testCaseId': test_case_id,
                'timestamp': None
            })

        try:
            files = os.listdir(SCREENSHOTS_DIR)
            # 只保留图像文件
            screenshot_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif'))]

            # 如果指定了测试用例ID，过滤匹配的文件
            if test_case_id:
                screenshot_files = [f for f in files if f.startswith(f'id_{test_case_id}_') or f.startswith(f'{test_case_id}_')]

            # 构建文件详情
            screenshot_details = []
            for filename in screenshot_files:
                file_path = os.path.join(SCREENSHOTS_DIR, filename)
                try:
                    stat = os.stat(file_path)
                    screenshot_details.append({
                        'name': filename,
                        'path': f'/api/files/screenshots/{filename}',
                        'size': stat.st_size,
                        'lastModified': stat.st_mtime
                    })
                except OSError:
                    continue

            return jsonify({
                'success': True,
                'screenshots': screenshot_files,
                'screenshotDetails': screenshot_details,
                'testCaseId': test_case_id,
                'timestamp': None
            })

        except OSError:
            return jsonify({
                'success': True,
                'screenshots': [],
                'screenshotDetails': [],
                'testCaseId': test_case_id,
                'timestamp': None
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': '获取截图列表失败',
            'details': str(e),
            'screenshots': []
        }), 500

@files_bp.route('/clear', methods=['POST'])
def clear_images():
    """清空图片和截图目录"""
    try:
        logger.info("开始清空图片和截图目录")

        # 要清空的目录列表
        dirs_to_clear = [
            ('operation_img', OPERATION_IMAGES_DIR),
            ('display_img', DISPLAY_IMAGES_DIR),
            ('screenshots', SCREENSHOTS_DIR)
        ]

        cleared_dirs = []
        errors = []

        for dir_name, dir_path in dirs_to_clear:
            try:
                if os.path.exists(dir_path):
                    # 获取目录中的所有文件
                    files = os.listdir(dir_path)
                    file_count = 0

                    for filename in files:
                        file_path = os.path.join(dir_path, filename)
                        try:
                            if os.path.isfile(file_path):
                                os.remove(file_path)
                                file_count += 1
                            elif os.path.isdir(file_path):
                                shutil.rmtree(file_path)
                                file_count += 1
                        except Exception as e:
                            logger.warning(f"删除文件 {file_path} 失败: {str(e)}")
                            errors.append(f"删除文件 {filename} 失败: {str(e)}")

                    cleared_dirs.append(f"{dir_name}: 清空了 {file_count} 个文件")
                    logger.info(f"成功清空目录 {dir_path}, 删除了 {file_count} 个文件")
                else:
                    cleared_dirs.append(f"{dir_name}: 目录不存在，跳过")
                    logger.info(f"目录 {dir_path} 不存在，跳过")

            except Exception as e:
                error_msg = f"清空目录 {dir_name} 失败: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)

        # 构建响应消息
        if errors:
            message = f"部分清空完成。成功: {'; '.join(cleared_dirs)}。错误: {'; '.join(errors)}"
            logger.warning(message)
            return jsonify({
                'success': True,  # 即使有部分错误，只要有成功的就返回True
                'message': message,
                'cleared': cleared_dirs,
                'errors': errors
            })
        else:
            message = f"图片和截图目录清空完成。{'; '.join(cleared_dirs)}"
            logger.info(message)
            return jsonify({
                'success': True,
                'message': message,
                'cleared': cleared_dirs,
                'errors': []
            })

    except Exception as e:
        error_msg = f"清空图片和截图目录时发生错误: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'success': False,
            'message': error_msg,
            'cleared': [],
            'errors': [error_msg]
        }), 500