/**
 * 应用常量配置
 */

// 配置开关
const USE_FIXED_IP = process.env.NEXT_PUBLIC_USE_FIXED_IP === 'false';
const FIXED_API_URL = process.env.NEXT_PUBLIC_FIXED_API_URL || 'http://10.0.18.132:5000';

// 自动检测API基础URL
const getBackendUrl = () => {
  // 如果使用固定IP，直接返回配置的URL
  if (USE_FIXED_IP) {
    return FIXED_API_URL;
  }
  
  // 尝试从环境变量获取
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // 检查是否在浏览器环境
  if (typeof window !== 'undefined') {
    // 判断是否同域部署（前后端部署在同一服务器的不同端口）
    // 如果是，使用相对URL
    const currentHost = window.location.hostname;
    // 使用相对路径，这样即使IP变化也不需要修改
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return `http://${currentHost}:5000`;
    }
  }
  
  // 备选方案：使用本地地址
  return 'http://localhost:5000';
};

// 导出API基础URL
export const API_BASE_URL = getBackendUrl();

// 其他常量
export const APP_NAME = '优亿医疗自动化测试平台';
export const APP_VERSION = '1.0.0'; 