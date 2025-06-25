import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  console.log(`请求的图像文件: ${filename} (files/images路由)`);
  
  try {
    // 更新为使用frontend/public/img目录
    const possiblePaths = [
      // 相对路径（开发环境）
      path.join(process.cwd(), '../data/img', filename),
      // 绝对路径（生产环境）
      // path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'img', filename),
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
        error: '图像文件不存在',
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
    console.log(`成功读取文件 ${filePath}, 大小: ${fileBuffer.length} 字节`);
    
    // 根据文件扩展名设置Content-Type
    let contentType = 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (filename.endsWith('.tiff') || filename.endsWith('.tif')) {
      contentType = 'image/tiff';
    }
    
    console.log(`返回图像文件: ${filename}, Content-Type: ${contentType}`);
    
    // 将Buffer转换为Uint8Array，这是Web API可接受的类型
    const uint8Array = new Uint8Array(fileBuffer);
    
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000' // 缓存1年
      }
    });
  } catch (error: any) {
    console.error(`处理图像请求时出错:`, error);
    return new NextResponse(
      JSON.stringify({ 
        error: '处理图像请求时出错', 
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