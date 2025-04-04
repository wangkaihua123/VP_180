// API 路由配置
export const API_ROUTES = {
  // SSH设置相关
  SSH_SETTINGS: {
    GET: '/api/ssh/settings',
    UPDATE: '/api/ssh/settings',
    TEST_CONNECTION: '/api/ssh/test',
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
  privateKeyPath?: string
  passphrase?: string
  remoteDir?: string
  authType?: 'password' | 'key'  // 在前端使用，不保存到文件
}

export interface TestCase {
  id: number;
  title: string;
  type: string;
  status: string;
  create_time: string;
  description: string;
  script_content: string;
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