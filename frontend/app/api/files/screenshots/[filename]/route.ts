import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  console.log(`请求的截图文件: ${filename} (files/screenshots路由)`);
  
  try {
    // 更新为使用frontend/public/screenshot目录
    const possiblePaths = [
      // 相对路径（开发环境）
      path.join(process.cwd(), 'public/screenshot', filename),
      // 绝对路径（生产环境）
      path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'screenshot', filename),
      // 旧路径（兼容性）
      path.join(process.cwd(), '../data/screenshots', filename),
      path.join('E:', 'python', 'vp_180', 'data', 'screenshots', filename)
    ];
    
    let filePath = null;
    let fileExists = false;
    
    // 尝试每一个可能的路径
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        fileExists = true;
        console.log(`找到截图文件: ${filePath}`);
        break;
      } catch (error) {
        // 静默失败，继续尝试下一个路径
      }
    }
    
    if (!fileExists || !filePath) {
      console.error(`找不到截图文件: ${filename}`);
      return new NextResponse('截图文件不存在', { status: 404 });
    }
    
    // 读取文件内容
    const fileBuffer = await fs.readFile(filePath);
    
    // 根据文件扩展名设置Content-Type
    let contentType = 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (filename.endsWith('.tiff') || filename.endsWith('.tif')) {
      contentType = 'image/tiff';
    }
    
    // 添加CORS头
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000' // 缓存1年
      }
    });
  } catch (error: any) {
    console.error(`处理截图请求时出错: ${error}`);
    return new NextResponse(
      JSON.stringify({ 
        error: '处理截图请求时出错', 
        details: error.message || '未知错误',
        filename: filename
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 