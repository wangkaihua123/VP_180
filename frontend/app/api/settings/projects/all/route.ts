import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 获取项目根目录（frontend的上一级目录）
function getRootDir() {
  // 从当前文件位置（frontend/app/api/settings/projects/all/route.ts）向上5级到达项目根目录
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

// POST: 保存所有项目
export async function POST(request: NextRequest) {
  try {
    const { projects } = await request.json();
    
    if (!Array.isArray(projects)) {
      return NextResponse.json(
        { success: false, message: '无效的项目数据' },
        { status: 400 }
      );
    }
    
    const settings = readSettings();
    
    // 更新项目列表
    settings.projects = projects;
    
    if (writeSettings(settings)) {
      return NextResponse.json({ 
        success: true, 
        message: '所有项目已成功保存'
      });
    } else {
      throw new Error('保存项目失败');
    }
  } catch (error) {
    console.error('保存所有项目失败:', error);
    return NextResponse.json(
      { success: false, message: '保存所有项目失败' },
      { status: 500 }
    );
  }
} 