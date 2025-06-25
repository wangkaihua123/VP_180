import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数，用于过滤特定测试用例的图像
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    
    console.log(`请求图像列表 ${testCaseId ? `(测试用例ID: ${testCaseId})` : ''} (files/images/list路由)`);
    
    // 更新为使用frontend/public/img目录
    const possibleDirs = [
      // 相对路径（开发环境）
      path.join(process.cwd(), '../data/img'),
      // 绝对路径（生产环境）
      // path.join('E:', 'python', 'vp_180', 'frontend', 'public', 'img'),
    ];
    
    let imgDirPath: string | null = null;
    let dirExists = false;
    
    // 尝试每一个可能的路径
    for (const testPath of possibleDirs) {
      try {
        await fs.access(testPath);
        imgDirPath = testPath;
        dirExists = true;
        console.log(`找到图像目录: ${imgDirPath}`);
        break;
      } catch (error) {
        console.log(`图像目录不存在: ${testPath}`);
      }
    }
    
    if (!dirExists || !imgDirPath) {
      console.error('找不到图像目录');
      return NextResponse.json(
        { error: '找不到图像目录', images: [] },
        { status: 404 }
      );
    }
    
    // 读取目录中的所有文件
    let files: string[] = await fs.readdir(imgDirPath);
    
    // 只保留图像文件（.png, .jpg, .jpeg, .gif, .tiff）
    files = files.filter(file => 
      /\.(png|jpg|jpeg|gif|tiff|tif)$/i.test(file)
    );
    
    // 如果指定了测试用例ID，过滤匹配的图像文件
    if (testCaseId) {
      // 文件名格式应该是id_{testCaseId}_*.png
      const regex = new RegExp(`^id_${testCaseId}_`, 'i');
      files = files.filter(file => regex.test(file));
    }
    
    // 获取文件的详细信息
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        try {
          const filePath = path.join(imgDirPath!, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            path: `/api/files/images/${file}`,
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        } catch (error) {
          console.error(`获取文件信息时出错: ${file}`, error);
          return null;
        }
      })
    );
    
    // 过滤掉无法获取信息的文件
    const validFiles = fileInfos.filter(Boolean);
    
    console.log(`找到 ${validFiles.length} 个图像文件 (files/images/list路由)`);
    
    // 返回图像列表
    return NextResponse.json({
      success: true,
      images: files, // 简单返回文件名列表，前端可以自行构建完整URL
      imageDetails: validFiles, // 返回详细信息对象数组
      testCaseId: testCaseId || null,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error(`处理图像列表请求时出错:`, error);
    return NextResponse.json({
      success: false,
      error: '处理图像列表请求时出错',
      details: error.message || '未知错误',
      images: []
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
} 