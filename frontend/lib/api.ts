/**
 * API服务模块
 * 
 * 该文件提供了与后端API通信的核心功能：
 * - 定义基础URL和通用请求处理函数fetchAPI
 * - 提供SSH设置相关API (sshSettingsAPI)：获取、更新、测试连接
 * - 提供串口设置相关API (serialSettingsAPI)：获取可用端口、获取设置、更新设置、测试连接
 * - 提供批量执行相关API (batchExecutionAPI)：执行所有测试、获取批次状态
 * 
 * 该模块是前端与后端通信的核心桥梁，封装了所有API调用的实现细节。
 */
import { API_ROUTES, SSHSettings, SerialSettings, SerialPort, TestCase, TestLog, BatchExecutionStatus } from '@/app/api/routes'

// API请求基础配置
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://172.16.10.83:5000/'

// 通用请求处理函数
export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`[API] Requesting: ${BASE_URL}${endpoint}`)
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API] Error response:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const data = await response.json()
    console.log(`[API] Response:`, data)
    return data
  } catch (error) {
    console.error(`[API] Request failed:`, error)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`无法连接到服务器 (${BASE_URL})。请确保服务器正在运行且可访问。`)
    }
    throw error
  }
}

// SSH设置相关API
export const sshSettingsAPI = {
  get: async () => {
    const data = await fetchAPI('/api/ssh/settings')
    // 后端已使用驼峰命名，不需要转换
    return {
      host: data.sshHost,
      port: data.sshPort,
      username: data.sshUsername,
      password: data.sshPassword
    }
  },
  
  update: (settings: SSHSettings) => {
    // 转换字段名以匹配后端
    const data = {
      sshHost: settings.host,
      sshPort: settings.port,
      sshUsername: settings.username,
      sshPassword: settings.password
    }
    return fetchAPI('/api/ssh/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
    
  testConnection: (settings: SSHSettings) => {
    // 转换字段名以匹配后端
    const data = {
      sshHost: settings.host,
      sshPort: settings.port,
      sshUsername: settings.username,
      sshPassword: settings.password
    }
    return fetchAPI('/api/ssh/test', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// 串口设置相关API
export const serialSettingsAPI = {
  getPorts: async () => {
    const response = await fetchAPI(API_ROUTES.SERIAL_SETTINGS.GET_PORTS)
    return response.ports as SerialPort[]
  },
  
  get: async () => {
    return await fetchAPI(API_ROUTES.SERIAL_SETTINGS.GET) as SerialSettings
  },
  
  update: (settings: SerialSettings) => {
    return fetchAPI(API_ROUTES.SERIAL_SETTINGS.UPDATE, {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
    
  testConnection: (settings: SerialSettings) => {
    return fetchAPI(API_ROUTES.SERIAL_SETTINGS.TEST_CONNECTION, {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  },
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