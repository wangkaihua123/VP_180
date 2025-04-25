import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const logPaths = [
      // 相对路径（开发环境）
      path.join(process.cwd(), '../data/logs'),
      // 绝对路径（生产环境）
      path.join('E:', 'python', 'vp_180', 'data', 'logs'),
      // 项目内部路径（备选）
      path.join(process.cwd(), 'data/logs')
    ];
    
    let logDirPath = null;
    let dirExists = false;
    
    // 尝试每一个可能的路径
    for (const testPath of logPaths) {
      console.log(`尝试日志目录路径: ${testPath}`);
      try {
        await fs.access(testPath);
        logDirPath = testPath;
        dirExists = true;
        console.log(`找到日志目录: ${logDirPath}`);
        break;
      } catch (error) {
        console.log(`日志目录不存在: ${testPath}`);
      }
    }
    
    if (!dirExists || !logDirPath) {
      console.error('找不到日志目录');
      return new NextResponse(JSON.stringify({ error: '找不到日志目录' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // 读取日志文件列表
    const files = await fs.readdir(logDirPath);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    if (logFiles.length === 0) {
      return new NextResponse(JSON.stringify({ logs: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // 按修改时间排序，获取最新的日志文件
    const fileStats = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(logDirPath, file);
        const stats = await fs.stat(filePath);
        return { file, stats, path: filePath };
      })
    );
    
    fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    const latestLogFile = fileStats[0];
    
    // 读取最新的日志文件内容
    const logContent = await fs.readFile(latestLogFile.path, 'utf8');
    
    // 解析日志内容为结构化数据
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');
    const logEntries = logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        // 如果无法解析为JSON，则返回原始行
        return { raw: line, timestamp: new Date().toISOString(), level: 'unknown', message: line };
      }
    });
    
    return new NextResponse(JSON.stringify({ logs: logEntries }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
    });
  } catch (error: any) {
    console.error(`处理日志请求时出错: ${error}`);
    return new NextResponse(JSON.stringify({ error: `处理日志请求时出错: ${error.message}` }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 