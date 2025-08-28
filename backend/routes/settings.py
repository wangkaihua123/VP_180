"""
项目设置路由处理模块 - 处理项目设置的API
"""
from flask import request, jsonify
from . import settings_bp
from models.settings import Settings


@settings_bp.route('/projects', methods=['GET'])
def get_projects():
    """获取项目列表"""
    try:
        settings = Settings.load()
        projects = settings.get('projects', [])
        
        return jsonify({
            'success': True,
            'projects': projects
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"获取项目列表失败: {str(e)}"
        }), 500


@settings_bp.route('/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    try:
        data = request.json
        
        # 验证必填字段
        if not data.get('name') or not data.get('name').strip():
            return jsonify({
                'success': False,
                'message': '项目名称不能为空'
            }), 400
            
        # 验证分辨率字段
        if not data.get('resolutionWidth') or not str(data.get('resolutionWidth')).strip():
            return jsonify({
                'success': False,
                'message': '分辨率宽度不能为空'
            }), 400
            
        if not data.get('resolutionHeight') or not str(data.get('resolutionHeight')).strip():
            return jsonify({
                'success': False,
                'message': '分辨率高度不能为空'
            }), 400
            
        # 验证分辨率是否为有效数字
        try:
            resolution_width = int(data.get('resolutionWidth'))
            resolution_height = int(data.get('resolutionHeight'))
            if resolution_width <= 0 or resolution_height <= 0:
                return jsonify({
                    'success': False,
                    'message': '分辨率必须为正整数'
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': '分辨率必须为有效的整数'
            }), 400
        
        # 加载现有设置
        settings = Settings.load()
        projects = settings.get('projects', [])
        
        # 检查项目名称是否已存在
        if any(p.get('name') == data['name'] for p in projects):
            return jsonify({
                'success': False,
                'message': '项目名称已存在'
            }), 400
        
        # 生成项目ID
        import time
        import random
        timestamp = str(int(time.time() * 1000))[-6:]  # 时间戳后6位
        random_part = str(random.randint(1000, 9999))
        project_id = f"{timestamp}{random_part}"
        
        # 创建新项目
        from datetime import datetime
        now = datetime.now().isoformat() + 'Z'
        
        new_project = {
            'id': project_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'createTime': now,
            'updateTime': now,
            'imagePath': data.get('imagePath', ''),
            'systemType': data.get('systemType', 'android'),
            'screenshotPath': data.get('screenshotPath', ''),
            'imageTypes': data.get('imageTypes', ''),
            'resolutionWidth': int(data.get('resolutionWidth')),
            'resolutionHeight': int(data.get('resolutionHeight'))
        }
        
        # 添加到项目列表
        projects.append(new_project)
        settings['projects'] = projects
        
        # 保存设置
        if Settings.save(settings):
            return jsonify({
                'success': True,
                'project': new_project
            })
        else:
            return jsonify({
                'success': False,
                'message': '保存项目失败'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"创建项目失败: {str(e)}"
        }), 500


@settings_bp.route('/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目"""
    try:
        data = request.json
        
        # 验证必填字段
        if not data.get('name') or not data.get('name').strip():
            return jsonify({
                'success': False,
                'message': '项目名称不能为空'
            }), 400
            
        # 验证分辨率字段
        if not data.get('resolutionWidth') or not str(data.get('resolutionWidth')).strip():
            return jsonify({
                'success': False,
                'message': '分辨率宽度不能为空'
            }), 400
            
        if not data.get('resolutionHeight') or not str(data.get('resolutionHeight')).strip():
            return jsonify({
                'success': False,
                'message': '分辨率高度不能为空'
            }), 400
            
        # 验证分辨率是否为有效数字
        try:
            resolution_width = int(data.get('resolutionWidth'))
            resolution_height = int(data.get('resolutionHeight'))
            if resolution_width <= 0 or resolution_height <= 0:
                return jsonify({
                    'success': False,
                    'message': '分辨率必须为正整数'
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': '分辨率必须为有效的整数'
            }), 400
        
        # 加载现有设置
        settings = Settings.load()
        projects = settings.get('projects', [])
        
        # 查找要更新的项目
        project_index = -1
        for i, project in enumerate(projects):
            if project.get('id') == project_id:
                project_index = i
                break
        
        if project_index == -1:
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404
        
        # 检查项目名称是否与其他项目重复
        for i, project in enumerate(projects):
            if i != project_index and project.get('name') == data['name']:
                return jsonify({
                    'success': False,
                    'message': '项目名称已存在'
                }), 400
        
        # 更新项目
        from datetime import datetime
        now = datetime.now().isoformat() + 'Z'
        
        updated_project = {
            **projects[project_index],
            'name': data['name'],
            'description': data.get('description', ''),
            'updateTime': now,
            'imagePath': data.get('imagePath', ''),
            'systemType': data.get('systemType', 'android'),
            'screenshotPath': data.get('screenshotPath', ''),
            'imageTypes': data.get('imageTypes', ''),
            'resolutionWidth': int(data.get('resolutionWidth')),
            'resolutionHeight': int(data.get('resolutionHeight'))
        }
        
        projects[project_index] = updated_project
        settings['projects'] = projects
        
        # 保存设置
        if Settings.save(settings):
            return jsonify({
                'success': True,
                'project': updated_project
            })
        else:
            return jsonify({
                'success': False,
                'message': '保存项目失败'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"更新项目失败: {str(e)}"
        }), 500


@settings_bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目"""
    try:
        # 加载现有设置
        settings = Settings.load()
        projects = settings.get('projects', [])
        
        # 查找要删除的项目
        project_to_delete = None
        for i, project in enumerate(projects):
            if project.get('id') == project_id:
                project_to_delete = projects.pop(i)
                break
        
        if project_to_delete is None:
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404
        
        # 更新设置
        settings['projects'] = projects
        
        # 保存设置
        if Settings.save(settings):
            return jsonify({
                'success': True,
                'message': f'项目 "{project_to_delete.get("name", "")}" 已成功删除'
            })
        else:
            return jsonify({
                'success': False,
                'message': '保存项目失败'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f"删除项目失败: {str(e)}"
        }), 500
