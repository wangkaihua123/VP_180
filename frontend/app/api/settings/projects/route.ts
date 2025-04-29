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
    // 确保目录存在
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

// GET: 获取项目列表
export async function GET() {
  try {
    const settings = readSettings();
    const projects = settings.projects || [];
    
    console.log(`从 ${settingsFilePath} 读取到 ${projects.length} 个项目`);
    
    return NextResponse.json({ 
      success: true, 
      projects 
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// POST: 创建新项目
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: '项目名称不能为空' },
        { status: 400 }
      );
    }
    
    const settings = readSettings();
    const projects = settings.projects || [];
    
    // 检查项目名称是否已存在
    if (projects.some((p: any) => p.name === name)) {
      return NextResponse.json(
        { success: false, message: '项目名称已存在' },
        { status: 400 }
      );
    }
    
    // 生成简短的数字ID - 使用时间戳后6位和随机数组合
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const newId = `${timestamp}${randomPart}`;
    
    const now = new Date().toISOString();
    const newProject = {
      id: newId,
      name,
      description: description || '',
      createTime: now,
      updateTime: now
    };
    
    projects.push(newProject);
    settings.projects = projects;
    
    console.log(`准备保存新项目到 ${settingsFilePath}`, newProject);
    
    if (writeSettings(settings)) {
      return NextResponse.json({ 
        success: true, 
        project: newProject 
      });
    } else {
      throw new Error('保存项目失败');
    }
  } catch (error) {
    console.error('创建项目失败:', error);
    return NextResponse.json(
      { success: false, message: '创建项目失败' },
      { status: 500 }
    );
  }
} 