import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // 解析请求数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const testCaseId = formData.get('testCaseId') as string;
    const fileType = formData.get('fileType') as string || 'screenshot'; // 默认为screenshot

    console.log(`接收到文件上传请求: 文件类型=${fileType}, 测试用例ID=${testCaseId || '无'}, 文件名=${file?.name || '无'}`);

    if (!file) {
      console.error('上传失败: 没有找到文件');
      return NextResponse.json(
        { success: false, error: '没有找到上传的文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      console.error(`上传失败: 文件类型不是图片 (${file.type})`);
      return NextResponse.json(
        { success: false, error: '只能上传图片文件', fileType: file.type },
        { status: 400 }
      );
    }

    console.log(`文件信息: 类型=${file.type}, 大小=${file.size}字节`);

    // 获取 fileName 字段
    const customFileName = formData.get('fileName') as string | undefined;
    // 获取 targetDir 字段
    const targetDir = formData.get('targetDir') as string | undefined;

    // 确定保存目录
    let saveDir;
    if (fileType === 'operation_img' || targetDir === 'operation_img') {
      saveDir = path.join(process.cwd(), 'data', 'img', 'operation_img');
    } else if (fileType === 'screenshot') {
      saveDir = path.join(process.cwd(), 'public/screenshot/upload');
    } else {
      saveDir = path.join(process.cwd(), 'public/img/upload');
    }
    console.log(`保存目录: ${saveDir}`);

    // 确保目录存在
    try {
      await fs.mkdir(saveDir, { recursive: true });
      console.log(`确保目录存在: ${saveDir}`);
    } catch (dirError) {
      console.error(`创建目录失败: ${dirError instanceof Error ? dirError.message : '未知错误'}`);
      // 继续执行，因为目录可能已经存在
    }

    // 生成文件名，优先用前端 fileName
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = customFileName && customFileName.endsWith('.png')
      ? customFileName
      : `${Date.now()}.${fileExtension}`;
    const filePath = path.join(saveDir, fileName);
    console.log(`将保存文件到: ${filePath}`);

    try {
      // 将文件内容转换为Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`文件内容已转换为Buffer, 大小: ${buffer.length}字节`);
      
      // 写入文件
      await fs.writeFile(filePath, buffer);
      console.log(`文件已成功写入: ${filePath}`);

      // 验证文件是否成功写入
      try {
        const stats = await fs.stat(filePath);
        console.log(`文件验证成功: 大小=${stats.size}字节, 创建时间=${stats.birthtime}`);
      } catch (statError) {
        console.error(`文件验证失败: ${statError instanceof Error ? statError.message : '未知错误'}`);
        throw new Error('文件保存后无法验证');
      }
    } catch (writeError) {
      console.error(`写入文件失败: ${writeError instanceof Error ? writeError.message : '未知错误'}`);
      return NextResponse.json(
        { 
          success: false, 
          error: '保存文件失败',
          details: writeError instanceof Error ? writeError.message : '未知错误'
        },
        { status: 500 }
      );
    }

    // 生成访问URL (确保URL格式正确)
    const fileUrl = fileType === 'screenshot'
      ? `/api/files/screenshots/${fileName}`
      : `/api/files/images/${fileName}`;
    
    // 生成备用URL (直接指向文件的相对路径)
    const alternativeUrl = fileType === 'screenshot'
      ? `/screenshot/upload/${fileName}`
      : `/img/upload/${fileName}`;

    console.log(`文件已保存: ${filePath}`);
    console.log(`主要访问URL: ${fileUrl}`);
    console.log(`备用访问URL: ${alternativeUrl}`);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      fileName,
      fileUrl,
      alternativeUrl,
      fileType,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
      testCaseId: testCaseId || null
    });
  } catch (error: any) {
    console.error('文件上传处理错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '文件上传失败',
        details: error.message || '未知错误',
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 