/**
 * 应用常量配置
 */

// 自动检测API基础URL
const getBackendUrl = () => {
  // 优先使用固定IP设置
  if (typeof window !== 'undefined') {
    // 从localStorage读取IP设置
    const storedSettings = localStorage.getItem('ipSettings');
    
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        if (settings.useFixedIp) {
          return `http://${settings.fixedHost}:${settings.fixedPort}`;
        }
      } catch (error) {
        console.error('解析IP设置失败:', error);
      }
    }
    
    // 如果没有使用固定IP或解析失败，使用当前主机名
    return `http://${window.location.hostname}:5000`;
  }
  
  // 非浏览器环境，使用环境变量或默认值
  if (process.env.NEXT_PUBLIC_FIXED_API_URL) {
    return process.env.NEXT_PUBLIC_FIXED_API_URL;
  }
  
  // 兜底
  return 'http://localhost:5000';
};

// 导出API基础URL
export const API_BASE_URL = getBackendUrl();

// 其他常量
export const APP_NAME = '优亿医疗自动化测试平台';
export const APP_VERSION = '1.0.0'; 