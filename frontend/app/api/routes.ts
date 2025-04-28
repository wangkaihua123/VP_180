// API 路由配置
export const API_ROUTES = {
  // SSH设置相关
  SSH_SETTINGS: {
    GET: '/api/ssh/settings',
    UPDATE: '/api/ssh/settings',
    TEST_CONNECTION: '/api/ssh/test',
  },
  
  // 串口设置相关
  SERIAL_SETTINGS: {
    GET_PORTS: '/api/serial/ports',
    GET: '/api/serial/settings',
    UPDATE: '/api/serial/settings',
    TEST_CONNECTION: '/api/serial/test',
  },
  
  // 测试用例相关
  TEST_CASES: {
    LIST: '/api/test-cases',
    CREATE: '/api/test-cases',
    GET: (id: string) => `/api/test-cases/${id}`,
    UPDATE: (id: string) => `/api/test-cases/${id}`,
    DELETE: (id: string) => `/api/test-cases/${id}`,
    EXECUTE: (id: string) => `/api/test-cases/${id}/execute`,
    GET_LOGS: (id: string) => `/api/test-cases/${id}/logs`,
  },
  
  // 批量执行相关
  BATCH_EXECUTION: {
    EXECUTE_ALL: '/api/test-cases/execute-all',
    GET_BATCH_STATUS: (batchId: string) => `/api/executions/${batchId}/status`,
  }
}

// 接口响应类型定义
export interface SSHSettings {
  host: string
  port: number
  username: string
  password?: string
}

export interface SerialPort {
  device: string
  description: string
  hwid: string
}

export interface SerialSettings {
  port: string
  baudRate: string
}

export interface TestCase {
  id: number;
  title: string;
  type: string;
  status: string;
  create_time: string;
  description: string;
  script_content: string;
  last_execution_time?: string;
  serial_connect?: boolean;
}

export interface TestLog {
  id: string;
  testCaseId: string;
  status: string;
  output: string;
  startTime: string;
  endTime: string;
  error?: string;
}

export interface BatchExecutionStatus {
  batchId: string
  status: 'running' | 'completed' | 'failed'
  totalTests: number
  completedTests: number
  failedTests: number
  startTime: string
  endTime?: string
} 