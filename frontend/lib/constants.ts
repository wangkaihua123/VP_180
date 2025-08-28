/**
 * 应用常量配置
 */
import { getBackendUrl } from './config';

// 导出API基础URL - 统一从配置管理
export const API_BASE_URL = getBackendUrl();

// API路由常量
export const API_ROUTES = {
  TEST_CASES: '/api/test-cases',
  SSH_SETTINGS: {
    GET: '/api/ssh/settings',
    UPDATE: '/api/ssh/settings',
    TEST_CONNECTION: '/api/ssh/test',
    DISCONNECT: '/api/ssh/disconnect',
    UPLOAD_TOUCH_SCRIPT: '/api/ssh/upload-touch-script',
  },
  SERIAL_SETTINGS: {
    GET_PORTS: '/api/serial/ports',
    GET: '/api/serial/settings',
    UPDATE: '/api/serial/settings',
    TEST_CONNECTION: '/api/serial/test',
    DISCONNECT: '/api/serial/disconnect',
  },
  BATCH_EXECUTION: {
    EXECUTE_ALL: '/api/test-cases/run-all',
    GET_STATUS: '/api/test-cases/batch/status',
    GET_BATCH_STATUS: (batchId: string) => `/api/test-cases/batch/${batchId}/status`,
  },
  LOGS: '/api/logs',
  FILES: '/api/files',
  REPORTS: {
    SAVE: '/api/reports/save',
    LATEST: '/api/reports/latest',
    LIST: '/api/reports/list',
  },
} as const;

// 其他常量
export const APP_NAME = '优亿医疗自动化测试平台';
export const APP_VERSION = '1.0.0'; 