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
      // 优先检查upload子目录（新路径）
      path.join(process.cwd(), 'public/screenshot/upload', filename),
      path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'screenshot', 'upload', filename),
      // 然后检查原始目录（兼容性）
      path.join(process.cwd(), 'public/screenshot', filename),
      path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'screenshot', filename),
      // 旧路径（兼容性）
      path.join(process.cwd(), '../backend/data/screenshots', filename),
      path.join('E:', 'python', 'vp_180', 'backend', 'data', 'screenshots', filename),
      // 添加更多可能的路径
      path.join(process.cwd(), 'public/img/upload', filename),
      path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'img', 'upload', filename),
      path.join(process.cwd(), 'public/img', filename),
      path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'img', filename),
      // 添加data/upload路径作为备用选项
      path.join(process.cwd(), '../backend/data/upload', filename),
      path.join('E:', 'python', 'vp_180', 'backend', 'data', 'upload', filename),
    ];
    
    let filePath = null;
    let fileExists = false;
    let triedPaths = []; // 记录尝试过的路径
    
    // 尝试每一个可能的路径
    for (const testPath of possiblePaths) {
      try {
        console.log(`尝试访问路径: ${testPath}`);
        await fs.access(testPath);
        filePath = testPath;
        fileExists = true;
        console.log(`找到文件: ${filePath}`);
        break;
      } catch (error) {
        // 记录尝试失败的路径
        console.log(`路径不存在: ${testPath}`);
        triedPaths.push(testPath);
      }
    }
    
    if (!fileExists || !filePath) {
      console.error(`找不到文件: ${filename}, 尝试过的路径:`, triedPaths);
      return new NextResponse(JSON.stringify({
        error: '截图文件不存在',
        filename: filename,
        triedPaths: triedPaths
      }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // 读取文件内容
    const fileBuffer = await fs.readFile(filePath);
    console.log(`成功读取截图文件 ${filePath}, 大小: ${fileBuffer.length} 字节`);
    
    // 根据文件扩展名设置Content-Type
    let contentType = 'image/png';
    const lowerFilename = filename.toLowerCase();
    
    // 扩展支持的图片格式
    if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lowerFilename.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (lowerFilename.endsWith('.tiff') || lowerFilename.endsWith('.tif')) {
      contentType = 'image/tiff';
    } else if (lowerFilename.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (lowerFilename.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (lowerFilename.endsWith('.bmp')) {
      contentType = 'image/bmp';
    } else if (lowerFilename.endsWith('.ico')) {
      contentType = 'image/x-icon';
    }
    
    console.log(`返回截图文件: ${filename}, Content-Type: ${contentType}`);
    
    // 将Buffer转换为ArrayBuffer
    const arrayBuffer = Buffer.from(fileBuffer).buffer;
    
    // 添加CORS头
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000' // 缓存1年
      }
    });
  } catch (error: any) {
    console.error(`处理截图请求时出错:`, error);
    return new NextResponse(
      JSON.stringify({ 
        error: '处理截图请求时出错', 
        details: error.message || '未知错误',
        filename: filename,
        stack: error.stack
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