import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// API处理函数：清空图片和截图目录
export async function POST() {
  try {
    console.log('处理清空图片和截图目录请求');
    
    // 获取目录路径
    const imgDir = path.join(process.cwd(), 'public', 'img');
    const screenshotDir = path.join(process.cwd(), 'public', 'screenshot');
    
    // 确保目录存在
    try {
      await fs.access(imgDir);
      await fs.access(screenshotDir);
    } catch (error) {
      // 如果目录不存在，创建它们
      try {
        await fs.mkdir(imgDir, { recursive: true });
        await fs.mkdir(screenshotDir, { recursive: true });
        console.log('已创建img和screenshot目录');
      } catch (mkdirError) {
        console.error('创建目录失败:', mkdirError);
        return NextResponse.json({
          success: false,
          message: `创建目录失败: ${mkdirError instanceof Error ? mkdirError.message : '未知错误'}`
        }, { status: 500 });
      }
    }
    
    // 清空img目录中的图片文件（保留temp子目录）
    try {
      const imgFiles = await fs.readdir(imgDir);
      
      // 处理每个文件/目录
      for (const file of imgFiles) {
        // 跳过temp目录
        if (file === 'temp') continue;
        
        const filePath = path.join(imgDir, file);
        const stat = await fs.stat(filePath);
        
        // 如果是文件，检查是否为图片文件，如果是则删除
        if (stat.isFile() && /\.(png|jpg|jpeg|gif|tiff|tif)$/i.test(file)) {
          await fs.unlink(filePath);
          console.log(`已删除图片文件: ${filePath}`);
        }
      }
      
      console.log('已清空img目录中的图片文件');
    } catch (imgError) {
      console.error('清空img目录失败:', imgError);
      return NextResponse.json({
        success: false,
        message: `清空图片目录失败: ${imgError instanceof Error ? imgError.message : '未知错误'}`
      }, { status: 500 });
    }
    
    // 清空screenshot目录中的截图文件（保留temp子目录）
    try {
      const screenshotFiles = await fs.readdir(screenshotDir);
      
      // 处理每个文件/目录
      for (const file of screenshotFiles) {
        // 跳过temp目录
        if (file === 'temp') continue;
        
        const filePath = path.join(screenshotDir, file);
        const stat = await fs.stat(filePath);
        
        // 如果是文件，检查是否为图片文件，如果是则删除
        if (stat.isFile() && /\.(png|jpg|jpeg|gif|tiff|tif)$/i.test(file)) {
          await fs.unlink(filePath);
          console.log(`已删除截图文件: ${filePath}`);
        }
      }
      
      console.log('已清空screenshot目录中的截图文件');
    } catch (screenshotError) {
      console.error('清空screenshot目录失败:', screenshotError);
      return NextResponse.json({
        success: false,
        message: `清空截图目录失败: ${screenshotError instanceof Error ? screenshotError.message : '未知错误'}`
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: '已成功清空图片和截图目录'
    });
  } catch (error) {
    console.error('处理清空图片和截图目录请求失败:', error);
    return NextResponse.json({
      success: false,
      message: `处理清空请求失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
} 