import { NextResponse } from 'next/server';

// 直接使用硬编码的后端URL，避免导入问题
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET() {
  try {
    // 请求后端API获取系统日志
    const response = await fetch(`${BACKEND_URL}/api/logs/vp180`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({
        success: false,
        message: error.message || '获取系统日志失败',
        data: []
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取系统日志失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取系统日志失败',
      data: []
    }, { status: 500 });
  }
} 