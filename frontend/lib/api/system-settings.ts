/**
 * 系统设置API模块
 * 
 * 该模块提供了与系统设置相关的API调用:
 * - 获取IP设置 (getIpSettings)
 * - 更新IP设置 (updateIpSettings)
 * 
 * 支持固定IP和自动IP两种模式
 */

// 定义IP设置接口
export interface IpSettings {
  useFixedIp: boolean;
  fixedHost: string;
  fixedPort: number;
}

// 系统设置API
export const systemSettingsAPI = {
  /**
   * 获取IP设置
   * @returns 当前IP设置
   */
  getIpSettings: async (): Promise<IpSettings> => {
    // 从localStorage获取IP设置
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem('ipSettings');
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
    }
    
    // 返回默认设置
    return {
      useFixedIp: false,
      fixedHost: 'localhost',
      fixedPort: 5000
    };
  },
  
  /**
   * 更新IP设置
   * @param settings 新的IP设置
   * @returns 操作结果
   */
  updateIpSettings: async (settings: IpSettings): Promise<{success: boolean; message: string}> => {
    try {
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('ipSettings', JSON.stringify(settings));
      }
      
      // 更新环境变量（实际上这里只是模拟，真正的改变需要应用重启）
      // 提示用户需要刷新页面使设置生效
      
      return {
        success: true,
        message: 'IP设置已更新，请刷新页面使设置生效'
      };
    } catch (error) {
      console.error('更新IP设置失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '更新IP设置失败'
      };
    }
  }
}; 