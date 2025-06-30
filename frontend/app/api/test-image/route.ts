import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 获取图像目录的路径
    const possibleDirs = [
      // 相对路径（开发环境）
      path.join(process.cwd(), '../backend/data/img'),
      // 绝对路径（生产环境）
      path.join('E:', 'python', 'vp_180', 'backend', 'data', 'img'),
      // 项目内部路径（备选）
      path.join(process.cwd(), 'backend/data/img')
    ];
    
    let imgDirPath: string | null = null;
    let dirExists = false;
    let imgFiles: string[] = [];
    
    // 尝试每一个可能的路径
    for (const testPath of possibleDirs) {
      try {
        await fs.access(testPath);
        imgDirPath = testPath;
        dirExists = true;
        
        // 读取目录中的文件
        const files = await fs.readdir(testPath);
        imgFiles = files.filter(file => 
          /\.(png|jpg|jpeg|gif|tiff|tif)$/i.test(file)
        );
        
        break;
      } catch (error) {
        console.log(`图像目录不存在: ${testPath}`);
      }
    }
    
    // 获取主机信息，用于构建完整URL
    const host = request.headers.get('host') || 'localhost';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    // 提取测试用例ID集合
    const testCaseIds = new Set<number>();
    imgFiles.forEach(file => {
      const match = file.match(/^id_(\d+)_/);
      if (match && match[1]) {
        testCaseIds.add(parseInt(match[1]));
      }
    });
    
    // 构建示例链接
    const exampleLinks = [];
    
    // 1. 图像列表API
    exampleLinks.push({
      name: '获取所有图像',
      url: `${baseUrl}/api/images/list`,
      description: '获取所有可用图像文件列表'
    });
    
    // 2. 根据测试用例ID过滤
    if (testCaseIds.size > 0) {
      const firstTestCaseId = Array.from(testCaseIds)[0];
      exampleLinks.push({
        name: `获取测试用例 #${firstTestCaseId} 的图像`,
        url: `${baseUrl}/api/images/list?testCaseId=${firstTestCaseId}`,
        description: `获取测试用例 #${firstTestCaseId} 的所有图像`
      });
    }
    
    // 3. 查看单张图像
    if (imgFiles.length > 0) {
      exampleLinks.push({
        name: '查看单张图像',
        url: `${baseUrl}/api/images/${imgFiles[0]}`,
        description: `查看图像文件: ${imgFiles[0]}`
      });
    }
    
    return NextResponse.json({
      success: true,
      message: '图像API测试端点',
      availableImages: imgFiles.length,
      imageDirectory: imgDirPath || '未找到',
      testCaseIds: Array.from(testCaseIds),
      apiEndpoints: [
        {
          path: '/api/images/list',
          method: 'GET',
          description: '获取所有图像文件列表',
          queryParams: ['testCaseId (可选): 按测试用例ID过滤图像']
        },
        {
          path: '/api/images/[filename]',
          method: 'GET',
          description: '获取指定的图像文件',
          pathParams: ['filename: 图像文件名']
        }
      ],
      exampleLinks,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    });
  } catch (error: any) {
    console.error('测试图像API出错:', error);
    return NextResponse.json({
      success: false,
      error: '测试图像API出错',
      details: error.message || '未知错误'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 