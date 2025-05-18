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
        // 使用 ' - ' 分割，但不限制分割次数
        const parts = line.split(' - ');
        if (parts.length >= 4) {
          const [timestamp, level, source, ...messageParts] = parts;
          return {
            timestamp,
            level,
            source,
            // 将剩余部分重新组合为完整的消息
            message: messageParts.join(' - ')
          };
        }
        return {
          timestamp: '',
          level: 'UNKNOWN',
          source: '',
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