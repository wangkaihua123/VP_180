import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// API处理函数：清空日志文件
export async function POST() {
  try {
    console.log('处理清空系统日志请求');
    
    // 日志文件路径
    const logFilePath = path.join(process.cwd(), '..', 'backend', 'data', 'logs', 'VP_180.log');
    
    try {
      // 清空文件内容（写入空字符串）
      await fs.writeFile(logFilePath, '', 'utf8');
      console.log(`成功清空日志文件: ${logFilePath}`);
      
      return NextResponse.json({
        success: true,
        message: '系统日志已清空'
      });
    } catch (fileError) {
      console.error('清空日志文件失败:', fileError);
      return NextResponse.json({
        success: false,
        message: fileError instanceof Error ? fileError.message : '清空日志文件失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('处理清空日志请求失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '处理清空日志请求失败'
    }, { status: 500 });
  }
} 