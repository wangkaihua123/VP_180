import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 处理保存测试报告请求
 * @param request POST请求，包含测试报告数据
 * @returns JSON响应
 */
export async function POST(request: Request) {
  try {
    // 解析请求体中的报告数据
    const reportData = await request.json();
    
    // 验证数据格式
    if (!reportData) {
      return NextResponse.json({ success: false, message: '未提供报告数据' }, { status: 400 });
    }
    
    // 获取数据目录的绝对路径
    // 使用process.cwd()获取项目根目录
    const dataDir = path.join(process.cwd(), 'data');
    
    // 确保数据目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 报告JSON文件的路径
    const reportFilePath = path.join(dataDir, 'report.json');
    
    // 添加生成时间戳
    const reportWithTimestamp = {
      ...reportData,
      generatedAt: new Date().toISOString()
    };
    
    // 将报告数据写入文件
    fs.writeFileSync(reportFilePath, JSON.stringify(reportWithTimestamp, null, 2));
    
    // 返回成功响应
    return NextResponse.json({ 
      success: true, 
      message: '测试报告已保存',
      path: reportFilePath 
    });
  } catch (error) {
    console.error('保存测试报告失败:', error);
    
    // 返回错误响应
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : '保存测试报告时发生未知错误' 
    }, { status: 500 });
  }
} 