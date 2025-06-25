import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: NextRequest) {
  try {
    console.log('接收到操作界面截图请求');
    
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const testCaseId = searchParams.get('testCaseId');
    const customFileName = searchParams.get('fileName');
    
    console.log(`测试用例ID: ${testCaseId || '无'}`);
    
    // 构建API请求URL（调用后端Python服务）
    const apiUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const url = `${apiUrl}/api/screen/capture${testCaseId ? `?testCaseId=${testCaseId}` : ''}`;
    
    console.log(`请求后端API: ${url}`);
    
    // 调用后端API获取截图
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`获取截图失败: HTTP ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: `获取截图失败: ${errorText}` },
        { status: response.status }
      );
    }
    
    // 解析响应
    const data = await response.json();
    
    if (!data.success || !data.imageBase64) {
      console.error('获取截图失败: 后端返回错误', data.error || '未知错误');
      return NextResponse.json(
        { success: false, error: data.error || '获取截图失败' },
        { status: 500 }
      );
    }
    
    // 解码Base64图像
    const imageBuffer = Buffer.from(data.imageBase64, 'base64');
    
    // 更新保存目录为public/screenshot/upload
    const saveDir = path.join(process.cwd(), 'public', 'screenshot', 'upload');
    
    // 确保目录存在
    try {
      await fs.mkdir(saveDir, { recursive: true });
      console.log(`确保目录存在: ${saveDir}`);
    } catch (dirError) {
      console.error(`创建目录失败: ${dirError instanceof Error ? dirError.message : '未知错误'}`);
      // 继续执行，因为目录可能已经存在
    }
    
    // 生成文件名，优先使用自定义
    const fileName = customFileName && customFileName.endsWith('.png')
      ? customFileName
      : (testCaseId 
        ? `id_${testCaseId}_screen_capture_${uuidv4()}.png`
        : `screen_capture_${uuidv4()}.png`);
    
    const filePath = path.join(saveDir, fileName);
    
    try {
      // 写入文件
      await fs.writeFile(filePath, imageBuffer);
      console.log(`截图已保存到: ${filePath}`);
      
      // 生成访问URL
      const fileUrl = `/api/files/screenshots/${fileName}`;
      
      // 添加备用URL，直接指向public目录
      const alternativeUrl = `/screenshot/upload/${fileName}`;
      
      // 返回成功响应
      return NextResponse.json({
        success: true,
        fileName,
        fileUrl,
        alternativeUrl,
        fileType: 'screenshot',
        fileSize: imageBuffer.length,
        testCaseId: testCaseId || null
      });
    } catch (writeError) {
      console.error(`保存截图失败: ${writeError instanceof Error ? writeError.message : '未知错误'}`);
      return NextResponse.json(
        { 
          success: false, 
          error: '保存截图失败',
          details: writeError instanceof Error ? writeError.message : '未知错误'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('处理截图请求时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取截图失败',
        details: error.message || '未知错误'
      },
      { status: 500 }
    );
  }
} 