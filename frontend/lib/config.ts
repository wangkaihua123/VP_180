/**
 * 统一配置管理
 * 
 * 所有IP地址和端口配置都在这里统一管理
 * 只需要修改 .env.local 文件中的配置即可
 */

// 获取后端主机地址
export const getBackendHost = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_HOST || '10.0.18.134';
};

// 获取后端端口
export const getBackendPort = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_PORT || '5000';
};

// 获取前端主机地址
export const getFrontendHost = (): string => {
  return process.env.NEXT_PUBLIC_FRONTEND_HOST || '10.0.18.134';
};

// 获取前端端口
export const getFrontendPort = (): string => {
  return process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000';
};

// 获取完整的后端API基础URL
export const getBackendUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || `http://${getBackendHost()}:${getBackendPort()}`;
};

// 获取完整的前端URL
export const getFrontendUrl = (): string => {
  return `http://${getFrontendHost()}:${getFrontendPort()}`;
};

// 导出常用的配置
export const CONFIG = {
  BACKEND_HOST: getBackendHost(),
  BACKEND_PORT: getBackendPort(),
  FRONTEND_HOST: getFrontendHost(),
  FRONTEND_PORT: getFrontendPort(),
  BACKEND_URL: getBackendUrl(),
  FRONTEND_URL: getFrontendUrl(),
} as const;

// 打印当前配置（用于调试）
export const printConfig = () => {
  console.log('当前配置:', CONFIG);
};
