"""
文件服务相关路由 - 处理图片和截图文件的访问
"""
import os
import shutil
import logging
from flask import send_from_directory, jsonify, request
from werkzeug.utils import secure_filename
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

@files_bp.route('/upload/list')
def list_upload_files():
    """获取前端upload目录的文件列表"""
    try:
        # 前端upload目录路径
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'public', 'img', 'upload')

        if not os.path.exists(upload_dir):
            logger.warning(f"Upload目录不存在: {upload_dir}")
            return jsonify({
                'success': True,
                'files': [],
                'message': 'Upload目录不存在'
            })

        try:
            files = os.listdir(upload_dir)
            # 过滤图片文件
            image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif', '.webp'))]

            # 按修改时间排序（最新的在前）
            image_files.sort(key=lambda x: os.path.getmtime(os.path.join(upload_dir, x)), reverse=True)

            logger.info(f"在upload目录找到 {len(image_files)} 个图片文件")

            return jsonify({
                'success': True,
                'files': image_files
            })

        except Exception as e:
            logger.error(f"扫描upload目录时出错: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'扫描upload目录时出错: {str(e)}'
            }), 500

    except Exception as e:
        logger.error(f"获取upload文件列表时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取upload文件列表时出错: {str(e)}'
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

@files_bp.route('/upload', methods=['POST'])
def upload_file():
    """上传文件到指定目录"""
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有选择文件'
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '没有选择文件'
            }), 400

        # 获取其他参数
        file_type = request.form.get('fileType', 'screenshot')  # 默认为screenshot
        custom_filename = request.form.get('fileName')
        test_case_id = request.form.get('testCaseId')

        # 验证文件类型
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'不支持的文件类型: {file_ext}。支持的类型: {", ".join(allowed_extensions)}'
            }), 400

        # 确定保存目录
        if file_type == 'screenshot':
            # 保存到前端public/img/upload目录，这样前端可以直接访问
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'public', 'img', 'upload')
        else:
            # 其他类型保存到后端目录
            upload_dir = IMAGES_DIR

        # 确保目录存在
        os.makedirs(upload_dir, exist_ok=True)

        # 确定文件名
        if custom_filename:
            # 使用自定义文件名，确保有正确的扩展名
            filename = custom_filename
            if not filename.lower().endswith(file_ext):
                filename = os.path.splitext(filename)[0] + file_ext
        else:
            # 使用安全的原始文件名
            filename = secure_filename(file.filename)

        # 构建完整的文件路径
        file_path = os.path.join(upload_dir, filename)

        # 如果文件已存在，先删除
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"删除已存在的文件: {file_path}")

        # 保存文件
        file.save(file_path)
        logger.info(f"文件上传成功: {file_path}")

        # 构建访问URL
        if file_type == 'screenshot':
            # 前端public目录的文件可以直接通过/img/upload/访问
            file_url = f'/img/upload/{filename}'
        else:
            # 后端文件通过API访问
            file_url = f'/api/files/images/{filename}'

        return jsonify({
            'success': True,
            'message': '文件上传成功',
            'filename': filename,
            'file_path': file_path,
            'file_url': file_url,
            'file_type': file_type,
            'test_case_id': test_case_id
        })

    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'文件上传失败: {str(e)}'
        }), 500

@files_bp.route('/delete', methods=['POST'])
def delete_file():
    """删除指定的文件"""
    try:
        data = request.get_json()
        if not data or 'fileUrl' not in data:
            return jsonify({
                'success': False,
                'error': '缺少fileUrl参数'
            }), 400

        file_url = data['fileUrl']
        logger.info(f"收到删除文件请求: {file_url}")

        # 解析文件路径
        file_path = None

        if file_url.startswith('/img/upload/'):
            # 前端public目录的文件
            filename = file_url.replace('/img/upload/', '')
            file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'public', 'img', 'upload', filename)
        elif file_url.startswith('/api/files/images/'):
            # 后端images目录的文件
            filename = file_url.replace('/api/files/images/', '')
            file_path = os.path.join(IMAGES_DIR, filename)
        elif file_url.startswith('/api/files/screenshots/'):
            # 后端screenshots目录的文件
            filename = file_url.replace('/api/files/screenshots/', '')
            file_path = os.path.join(SCREENSHOTS_DIR, filename)
        elif file_url.startswith('/api/files/operation_img/'):
            # 后端operation_images目录的文件
            filename = file_url.replace('/api/files/operation_img/', '')
            file_path = os.path.join(OPERATION_IMAGES_DIR, filename)
        elif file_url.startswith('/api/files/display_img/'):
            # 后端display_images目录的文件
            filename = file_url.replace('/api/files/display_img/', '')
            file_path = os.path.join(DISPLAY_IMAGES_DIR, filename)
        else:
            # 尝试直接作为文件名处理
            filename = os.path.basename(file_url)
            # 先尝试在upload目录中查找
            upload_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'public', 'img', 'upload', filename)
            if os.path.exists(upload_path):
                file_path = upload_path
            else:
                # 再尝试在images目录中查找
                images_path = os.path.join(IMAGES_DIR, filename)
                if os.path.exists(images_path):
                    file_path = images_path
                else:
                    # 最后尝试在screenshots目录中查找
                    screenshots_path = os.path.join(SCREENSHOTS_DIR, filename)
                    if os.path.exists(screenshots_path):
                        file_path = screenshots_path

        if not file_path:
            return jsonify({
                'success': False,
                'error': f'无法解析文件路径: {file_url}'
            }), 400

        # 检查文件是否存在
        if not os.path.exists(file_path):
            logger.warning(f"要删除的文件不存在: {file_path}")
            return jsonify({
                'success': True,
                'message': '文件不存在，视为删除成功',
                'file_path': file_path
            })

        # 删除文件
        os.remove(file_path)
        logger.info(f"文件删除成功: {file_path}")

        return jsonify({
            'success': True,
            'message': '文件删除成功',
            'file_path': file_path,
            'file_url': file_url
        })

    except Exception as e:
        logger.error(f"文件删除失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'文件删除失败: {str(e)}'
        }), 500