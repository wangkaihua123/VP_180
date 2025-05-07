import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    console.log('处理获取系统日志请求');
    
    // 日志文件路径
    const logFilePath = path.join(process.cwd(), '..', 'data', 'logs', 'VP_180.log');
    
    try {
      // 检查文件是否存在
      await fs.access(logFilePath);
      
      // 读取日志文件内容
      const content = await fs.readFile(logFilePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // 解析日志行
      const parsedLogs = lines.map(line => {
        const parts = line.split(' - ', 3);
        if (parts.length >= 3) {
          const [timestamp, level, rest] = parts;
          return {
            timestamp,
            level,
            message: rest
          };
        }
        return {
          timestamp: '',
          level: 'UNKNOWN',
          message: line
        };
      });
      
      return NextResponse.json({
        success: true,
        message: '成功获取日志数据',
        data: parsedLogs
      });
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('日志文件不存在:', logFilePath);
        return NextResponse.json({
          success: false,
          message: '日志文件不存在',
          data: []
        }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('获取系统日志失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取系统日志失败',
      data: []
    }, { status: 500 });
  }
} 