/**
 * 应用常量配置
 */

// 自动检测API基础URL
const getBackendUrl = () => {
  // 优先使用环境变量
  if (process.env.NEXT_PUBLIC_FIXED_API_URL) {
    return process.env.NEXT_PUBLIC_FIXED_API_URL;
  }
  // 浏览器环境下自动适配
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000`;
  }
  // 兜底
  return 'http://localhost:5000';
};

// 导出API基础URL
export const API_BASE_URL = getBackendUrl();

// 其他常量
export const APP_NAME = '优亿医疗自动化测试平台';
export const APP_VERSION = '1.0.0'; 