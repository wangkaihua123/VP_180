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
import { SSHSettings, SerialSettings, SerialPort } from '@/types/api'
import { API_BASE_URL, API_ROUTES } from './constants'



// 通用请求处理函数
export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`[API] Requesting: ${API_BASE_URL}${endpoint}`)
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
      throw new Error(`无法连接到服务器 (${API_BASE_URL})。请确保服务器正在运行且可访问。`)
    }
    throw error
  }
}

// 检查是否在客户端环境
const isClient = () => {
  return typeof window !== 'undefined'
}

// SSH设置相关API
export const sshSettingsAPI = {
  get: async () => {
    // 确保在客户端环境下执行
    if (isClient()) {
      // 从localStorage获取SSH设置
      const storedSettings = localStorage.getItem('sshSettings');
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
    }
    
    // 如果没有存储设置或不在客户端环境，返回默认设置
    return {
      host: "10.0.18.1",
      port: 22,
      username: "root",
      password: "firefly"
    };
  },
  
  update: (settings: SSHSettings) => {
    // 确保在客户端环境下执行
    if (isClient()) {
      // 将设置保存到localStorage
      localStorage.setItem('sshSettings', JSON.stringify(settings));
    }
    
    // 返回成功响应的Promise
    return Promise.resolve({
      success: true,
      message: 'SSH设置已更新'
    });
  },
    
  testConnection: (settings: SSHSettings) => {
    // 测试连接仍然需要调用后端API
    return fetchAPI(API_ROUTES.SSH_SETTINGS.TEST_CONNECTION, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },
  disconnect: async () => {
    return fetchAPI(API_ROUTES.SSH_SETTINGS.DISCONNECT, {
      method: 'POST',
    })
  },
}

// 串口设置相关API
export const serialSettingsAPI = {
  getPorts: async () => {
    const response = await fetchAPI(API_ROUTES.SERIAL_SETTINGS.GET_PORTS)
    console.log('[API] Ports response:', response)
    if (response && response.ports && Array.isArray(response.ports)) {
      return response.ports as SerialPort[]
    }
    return []
  },
  
  get: async () => {
    const response = await fetchAPI(API_ROUTES.SERIAL_SETTINGS.GET)
    return response.settings as SerialSettings
  },
  
  update: (settings: SerialSettings) => {
    return fetchAPI(API_ROUTES.SERIAL_SETTINGS.UPDATE, {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  },
    
  testConnection: (settings: SerialSettings) => {
    return fetchAPI(API_ROUTES.SERIAL_SETTINGS.TEST_CONNECTION, {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  },
  disconnect: async () => {
    return fetchAPI('/api/serial/disconnect', {
      method: 'POST',
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

// 统一设置保存API
export const unifiedSettingsAPI = {
  // 保存所有设置（SSH、串口、IP）
  saveAllSettings: async (
    sshSettings: SSHSettings, 
    serialSettings: SerialSettings, 
    ipSettings: any,
    projects?: any[]
  ) => {
    try {
      // 保存SSH设置到localStorage
      if (isClient()) {
        localStorage.setItem('sshSettings', JSON.stringify(sshSettings));
      }
      
      // 保存IP设置到localStorage
      if (isClient()) {
        localStorage.setItem('ipSettings', JSON.stringify(ipSettings));
      }
      
      // 创建一个不包含SSH设置的数据对象，只包含串口设置
      // 确保只传递必要的串口字段，避免传递SSH相关字段或其他无关字段
      const serialData = {
        serialPort: serialSettings.serialPort,
        serialBaudRate: serialSettings.serialBaudRate
      };
      
      // 串口设置需要发送到后端
      await fetchAPI(API_ROUTES.SERIAL_SETTINGS.UPDATE, {
        method: 'POST',
        body: JSON.stringify(serialData),
      });
      
      // 如果有项目数据且是管理员模式，则保存项目设置
      if (projects) {
        // 直接保存项目列表到后端 (这里需要后端提供一个保存所有项目的API)
        // 这部分需要后端支持，这里假设有一个API可以保存所有项目
        try {
          await fetch('/api/settings/projects/all', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ projects }),
          });
        } catch (projectError) {
          console.error('保存项目设置失败，但其他设置已保存:', projectError);
        }
      }
      
      return {
        success: true,
        message: '所有设置已更新'
      };
    } catch (error) {
      console.error('保存所有设置失败:', error);
      throw error;
    }
  }
} 