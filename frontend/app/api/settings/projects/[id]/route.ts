import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 使用绝对路径保存设置文件，确保只操作一个地方
const settingsFilePath = 'I:/VP-180/data/settings.json';

// 读取设置文件
function readSettings() {
  try {
    if (!fs.existsSync(settingsFilePath)) {
      return {};
    }
    const fileContent = fs.readFileSync(settingsFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('读取设置文件失败:', error);
    return {};
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
    const id = params.id;
    const { name, description } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: '项目名称不能为空' },
        { status: 400 }
      );
    }
    
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
    
    // 检查更新的名称是否与其他项目重名
    const nameExists = projects.some((p: any, index: number) => p.name === name && index !== projectIndex);
    if (nameExists) {
      return NextResponse.json(
        { success: false, message: '项目名称已存在' },
        { status: 400 }
      );
    }
    
    // 更新项目
    const updatedProject = {
      ...projects[projectIndex],
      name,
      description: description || '',
      updateTime: new Date().toISOString()
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