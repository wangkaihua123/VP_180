import { API_ROUTES, SSHSettings, TestCase, TestLog, BatchExecutionStatus } from '@/app/api/routes'

// API请求基础配置
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// 通用请求处理函数
export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

// SSH设置相关API
export const sshSettingsAPI = {
  get: async () => {
    const data = await fetchAPI('/api/ssh/settings')
    // 转换字段名以匹配前端
    return {
      host: data.ssh_host,
      port: data.ssh_port,
      username: data.ssh_username,
      password: data.ssh_password,
      authType: data.ssh_password ? 'password' : 'key'
    }
  },
  
  update: (settings: SSHSettings) => {
    // 转换字段名以匹配后端
    const data = {
      ssh_host: settings.host,
      ssh_port: settings.port,
      ssh_username: settings.username,
      ssh_password: settings.password
    }
    return fetchAPI('/api/ssh/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
    
  testConnection: (settings: SSHSettings) => {
    // 转换字段名以匹配后端
    const data = {
      ssh_host: settings.host,
      ssh_port: settings.port,
      ssh_username: settings.username,
      ssh_password: settings.password
    }
    return fetchAPI('/api/ssh/test', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// 测试用例相关API
export const testCaseAPI = {
  list: async () => {
    const response = await fetch(`${BASE_URL}/api/test-cases`)
    if (!response.ok) throw new Error("获取测试用例列表失败")
    const data = await response.json()
    const testCases = data.test_cases || []
    
    // 转换字段名
    return testCases.map((testCase: any) => {
      const convertedTestCase = { ...testCase }
      if (testCase.script_content) {
        const content = JSON.parse(testCase.script_content)
        if (content.operationSteps) {
          content.operationSteps = content.operationSteps.map((step: any) => ({
            ...step,
            operation_key: step.operation_type,
            operation_type: undefined
          }))
        }
        if (content.verificationSteps) {
          content.verificationSteps = content.verificationSteps.map((step: any) => ({
            ...step,
            verification_key: step.verification_type,
            verification_type: undefined
          }))
        }
        convertedTestCase.script_content = JSON.stringify(content)
      }
      return convertedTestCase
    })
  },
  create: async (testCase: Partial<TestCase>) => {
    // 转换字段名
    const convertedTestCase = { ...testCase }
    if (testCase.script_content) {
      const content = JSON.parse(testCase.script_content)
      if (content.operationSteps) {
        content.operationSteps = content.operationSteps.map((step: any) => ({
          ...step,
          operation_type: step.operation_key,
          operation_key: undefined
        }))
      }
      if (content.verificationSteps) {
        content.verificationSteps = content.verificationSteps.map((step: any) => ({
          ...step,
          verification_type: step.verification_key,
          verification_key: undefined
        }))
      }
      convertedTestCase.script_content = JSON.stringify(content)
    }

    const response = await fetch(`${BASE_URL}/api/test-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(convertedTestCase)
    })
    if (!response.ok) throw new Error("创建测试用例失败")
    return response.json()
  },
  get: async (id: number) => {
    const response = await fetch(`${BASE_URL}/api/test-cases/${id}`)
    if (!response.ok) throw new Error("获取测试用例失败")
    const data = await response.json()
    const testCase = data.test_case

    // 转换字段名
    const convertedTestCase = { ...testCase }
    if (testCase.script_content) {
      const content = JSON.parse(testCase.script_content)
      if (content.operationSteps) {
        content.operationSteps = content.operationSteps.map((step: any) => ({
          ...step,
          operation_key: step.operation_type,
          operation_type: undefined
        }))
      }
      if (content.verificationSteps) {
        content.verificationSteps = content.verificationSteps.map((step: any) => ({
          ...step,
          verification_key: step.verification_type,
          verification_type: undefined
        }))
      }
      convertedTestCase.script_content = JSON.stringify(content)
    }
    return { success: data.success, test_case: convertedTestCase }
  },
  update: async (id: number, testCase: Partial<TestCase>) => {
    // 转换字段名
    const convertedTestCase = { ...testCase }
    if (testCase.script_content) {
      const content = JSON.parse(testCase.script_content)
      if (content.operationSteps) {
        content.operationSteps = content.operationSteps.map((step: any) => ({
          ...step,
          operation_type: step.operation_key,
          operation_key: undefined
        }))
      }
      if (content.verificationSteps) {
        content.verificationSteps = content.verificationSteps.map((step: any) => ({
          ...step,
          verification_type: step.verification_key,
          verification_key: undefined
        }))
      }
      convertedTestCase.script_content = JSON.stringify(content)
    }

    const response = await fetch(`${BASE_URL}/api/test-cases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(convertedTestCase)
    })
    if (!response.ok) throw new Error("更新测试用例失败")
    return response.json()
  },
  delete: async (id: number) => {
    const response = await fetch(`${BASE_URL}/api/test-cases/${id}`, {
      method: "DELETE"
    })
    if (!response.ok) throw new Error("删除测试用例失败")
    return response.json()
  },
  runAll: async () => {
    const response = await fetch(`${BASE_URL}/api/test-cases/run-all`, {
      method: "POST"
    })
    if (!response.ok) throw new Error("执行所有测试用例失败")
    return response.json()
  },
  run: async (id: number) => {
    const response = await fetch(`${BASE_URL}/api/test-cases/${id}/run`, {
      method: "POST"
    })
    if (!response.ok) throw new Error("执行测试用例失败")
    return response.json()
  },
  getLatestLog: async (id: number) => {
    const response = await fetch(`${BASE_URL}/api/test-cases/${id}/latest-log`)
    if (!response.ok) throw new Error("获取测试用例日志失败")
    return response.json()
  }
}

// 批量执行相关API
export const batchExecutionAPI = {
  executeAll: () =>
    fetchAPI(API_ROUTES.BATCH_EXECUTION.EXECUTE_ALL, {
      method: 'POST',
    }),
    
  getBatchStatus: (batchId: string) =>
    fetchAPI(API_ROUTES.BATCH_EXECUTION.GET_BATCH_STATUS(batchId)),
} 