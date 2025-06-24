import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 获取项目根目录（frontend的上一级目录）
function getRootDir() {
  // 从当前文件位置（frontend/app/api/settings/projects/[id]/route.ts）向上5级到达项目根目录
  return path.resolve(process.cwd(), '..');
}

// 使用相对路径和项目根目录
const settingsFilePath = path.join(getRootDir(), 'data', 'settings.json');

// 读取设置文件
function readSettings() {
  try {
    if (!fs.existsSync(settingsFilePath)) {
      // 如果文件不存在，创建一个空的设置文件
      const defaultSettings = { projects: [] };
      writeSettings(defaultSettings);
      return defaultSettings;
    }
    const fileContent = fs.readFileSync(settingsFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('读取设置文件失败:', error);
    return { projects: [] };
  }
}

// 写入设置文件
function writeSettings(data: any) {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`成功保存设置到: ${settingsFilePath}`);
    return true;
  } catch (error) {
    console.error(`写入设置文件失败 ${settingsFilePath}:`, error);
    return false;
  }
}

// PUT: 更新项目
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { name, description, imagePath, systemType, screenshotPath, imageTypes } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: '项目名称不能为空' },
        { status: 400 }
      );
    }
    
    const settings = readSettings();
    const projects = settings.projects || [];
    
    // 查找项目
    const projectIndex = projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { success: false, message: '项目不存在' },
        { status: 404 }
      );
    }
    
    // 检查更新后的项目名称是否与其他项目冲突
    const nameExists = projects.some((p: any) => p.name === name && p.id !== projectId);
    if (nameExists) {
      return NextResponse.json(
        { success: false, message: '项目名称已存在' },
        { status: 400 }
      );
    }
    
    // 更新项目
    const now = new Date().toISOString();
    const updatedProject = {
      ...projects[projectIndex],
      name,
      description: description || '',
      imagePath: imagePath || '',
      systemType: systemType || 'android',
      screenshotPath: screenshotPath || '',
      imageTypes: imageTypes || '',
      updateTime: now
    };
    
    projects[projectIndex] = updatedProject;
    settings.projects = projects;
    
    if (writeSettings(settings)) {
      return NextResponse.json({ 
        success: true, 
        project: updatedProject 
      });
    } else {
      throw new Error('保存项目失败');
    }
  } catch (error) {
    console.error('更新项目失败:', error);
    return NextResponse.json(
      { success: false, message: '更新项目失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除项目
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const settings = readSettings();
    const projects = settings.projects || [];
    
    // 查找指定ID的项目
    const projectIndex = projects.findIndex((p: any) => p.id === id);
    if (projectIndex === -1) {
      return NextResponse.json(
        { success: false, message: '项目不存在' },
        { status: 404 }
      );
    }
    
    // 删除项目
    projects.splice(projectIndex, 1);
    settings.projects = projects;
    
    if (writeSettings(settings)) {
      return NextResponse.json({ 
        success: true, 
        message: '项目已成功删除' 
      });
    } else {
      throw new Error('删除项目失败');
    }
  } catch (error) {
    console.error('删除项目失败:', error);
    return NextResponse.json(
      { success: false, message: '删除项目失败' },
      { status: 500 }
    );
  }
} 