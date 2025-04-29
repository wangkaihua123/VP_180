import { NextResponse } from 'next/server';

// 使用与前端constants一致的后端URL获取机制
const getBackendUrl = () => {
  // 优先使用固定API环境变量
  if (process.env.NEXT_PUBLIC_FIXED_API_URL) {
    return process.env.NEXT_PUBLIC_FIXED_API_URL;
  }
  
  // 注意：这是服务器端代码，不应该引用window对象
  // Route Handlers总是在服务器端运行
  
  // 服务器端环境中，尝试从环境变量获取主机名
  if (process.env.FRONTEND_HOST) {
    return `http://${process.env.FRONTEND_HOST}:5000`;
  }
  
  // 兜底方案：使用本地主机
  return 'http://localhost:5000';
};

// 使用动态后端URL
const BACKEND_URL = getBackendUrl();

export async function GET() {
  try {
    console.log(`正在请求后端日志API: ${BACKEND_URL}/api/logs/vp180`);
    
    // 请求后端API获取系统日志
    const response = await fetch(`${BACKEND_URL}/api/logs/vp180`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // 增加跨域支持
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    });

    if (!response.ok) {
      let errorMsg = '获取系统日志失败';
      let errorData: any[] = [];
      try {
        const error = await response.json();
        errorMsg = error.message || errorMsg;
        errorData = error.data || errorData;
      } catch (e) {
        console.error('解析错误响应失败:', e);
      }
      
      console.error(`后端API请求失败: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        success: false,
        message: errorMsg,
        data: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`成功获取日志数据，记录数: ${data.data?.length || 0}`);
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