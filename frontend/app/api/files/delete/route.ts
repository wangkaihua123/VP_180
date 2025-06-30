import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // 解析请求数据
    const data = await request.json();
    const fileUrl = data.fileUrl;
    
    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: '未提供文件URL' },
        { status: 400 }
      );
    }
    
    // 从URL中提取文件名
    // URL格式可能是 /api/files/screenshots/filename.png 或 /api/files/images/filename.png
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    console.log(`尝试删除文件: ${filename}, 来自URL: ${fileUrl}`);
    
    // 确定可能的文件路径
    const possiblePaths = [
      // 优先检查upload子目录（新路径）
      path.join(process.cwd(), 'public/screenshot/upload', filename),
      path.join(process.cwd(), 'public/img/upload', filename),
      // 然后检查原始目录（兼容性）
      path.join(process.cwd(), 'public/screenshot', filename),
      path.join(process.cwd(), 'public/img', filename),

      // 旧路径（兼容性）
      path.join(process.cwd(), '../backend/data/screenshots', filename),
    ];
    
    // 尝试找到并删除文件
    let fileDeleted = false;
    let deletedPath = '';
    let errors = [];
    
    for (const filePath of possiblePaths) {
      try {
        console.log(`检查路径: ${filePath}`);
        await fs.access(filePath);
        // 文件存在，尝试删除
        await fs.unlink(filePath);
        fileDeleted = true;
        deletedPath = filePath;
        console.log(`成功删除文件: ${filePath}`);
        break;
      } catch (error) {
        // 记录错误但继续尝试其他路径
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        errors.push(`路径 ${filePath}: ${errorMsg}`);
        console.log(`文件不存在或无法删除: ${filePath}, 错误: ${errorMsg}`);
      }
    }
    
    if (fileDeleted) {
      return NextResponse.json({
        success: true,
        message: `文件已成功删除: ${filename}`,
        deletedPath
      });
    } else {
      console.error(`无法删除文件: ${filename}, 尝试了以下路径:`, possiblePaths);
      return NextResponse.json({
        success: false,
        error: `无法找到或删除文件: ${filename}`,
        triedPaths: possiblePaths,
        errors
      }, { status: 404 });
    }
  } catch (error) {
    console.error('处理删除文件请求时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '处理删除文件请求失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 