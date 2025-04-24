/**
 * 应用常量配置
 */

// 自动检测API基础URL
// 1. 优先使用环境变量
// 2. 如果在同一域名下，使用相对路径
// 3. 备选使用配置的IP地址
const getBackendUrl = () => {
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
  
  // 备选方案：使用配置的后端地址
  return 'http://10.0.18.132:5000';
};

// 导出后端API基础URL
export const BACKEND_URL = getBackendUrl();

// 其他常量
export const APP_NAME = '优亿医疗自动化测试平台';
export const APP_VERSION = '1.0.0'; 