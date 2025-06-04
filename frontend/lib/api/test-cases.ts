/**
 * 测试用例API模块
 * 
 * 该模块提供了与测试用例相关的所有API调用：
 * - 获取测试用例列表 (list)
 * - 创建新测试用例 (create)
 * - 更新测试用例 (update)
 * - 删除测试用例 (delete)
 * - 运行单个测试用例 (run)
 * - 批量运行测试用例 (runBatch)
 * - 运行所有测试用例 (runAll)
 * - 获取测试用例日志 (getLatestLogs, getLatestLog)
 * - 获取单个测试用例详情 (get)
 * - 更新测试用例状态 (updateStatus)
 * 
 * 所有API调用都使用标准的APIResponse接口返回结果，确保数据格式一致性。
 */
import { TestCase } from "@/app/api/routes"
import { fetchAPI } from "../api"

// 定义通用API响应接口
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  test_cases?: TestCase[];
  test_case?: TestCase;
}

// 定义测试执行结果接口
export interface TestExecutionResponse {
  success: boolean;
  message?: string;
  status?: string;
  details?: {
    operation_results?: { success: boolean; message?: string; data?: any }[];
    verification_results?: { success: boolean; message?: string }[];
  };
}

export const testCasesAPI = {
  list: async (): Promise<APIResponse<TestCase[]>> => {
    return fetchAPI("/api/test-cases", {
      method: "GET",
    })
  },

  create: async (testCase: Omit<TestCase, "id">): Promise<APIResponse<TestCase>> => {
    return fetchAPI("/api/test-cases", {
      method: "POST",
      body: JSON.stringify(testCase),
    })
  },

  update: async (id: number, testCase: Partial<TestCase>): Promise<APIResponse<TestCase>> => {
    return fetchAPI(`/api/test-cases/${id}`, {
      method: "PUT",
      body: JSON.stringify(testCase),
    })
  },

  delete: async (id: number): Promise<APIResponse<void>> => {
    return fetchAPI(`/api/test-cases/${id}`, {
      method: "DELETE",
    })
  },

  run: async (id: number): Promise<TestExecutionResponse> => {
    return fetchAPI(`/api/test-cases/${id}/run`, {
      method: "POST",
    })
  },

  runBatch: async (ids: number[]): Promise<APIResponse<void>> => {
    return fetchAPI("/api/test-cases/batch/run", {
      method: "POST",
      body: JSON.stringify({ ids }),
    })
  },

  runAll: async (): Promise<APIResponse<void>> => {
    return fetchAPI("/api/test-cases/run-all", {
      method: "POST",
    })
  },

  getLatestLogs: async (id: number): Promise<APIResponse<string>> => {
    return fetchAPI(`/api/test-cases/${id}/logs`, {
      method: "GET",
    })
  },

  getLatestLog: async (id: number): Promise<APIResponse<any>> => {
    return fetchAPI(`/api/test-cases/${id}/latest-log`, {
      method: "GET",
    })
  },

  get: async (id: number): Promise<APIResponse<TestCase>> => {
    return fetchAPI(`/api/test-cases/${id}`, {
      method: "GET",
    })
  },
  
  /**
   * 更新测试用例状态
   * @param id 测试用例ID
   * @param status 要更新的状态（通过、失败等）
   * @returns API响应
   */
  updateStatus: async (id: number, status: string): Promise<APIResponse<void>> => {
    return fetchAPI(`/api/test-cases/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  },

  /**
   * 获取VP_180.log日志文件内容
   * @returns VP_180.log日志文件内容
   */
  async getSystemLog() {
    try {
      const response = await fetch('/api/logs/vp180');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("获取系统日志失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "获取系统日志失败",
        data: []
      };
    }
  },

  /**
   * 清空VP_180.log日志文件
   * @returns 操作结果
   */
  async clearSystemLog() {
    try {
      const response = await fetch('/api/logs/vp180/clear', {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("清空系统日志失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "清空系统日志失败"
      };
    }
  },

  /**
   * 清空图片和截图目录
   * @returns 操作结果
   */
  async clearImages() {
    try {
      const response = await fetch('/api/files/clear', {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("清空图片和截图目录失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "清空图片和截图目录失败"
      };
    }
  },

  /**
   * 保存测试报告数据到JSON文件
   * @param reportData 要保存的测试报告数据
   * @returns 操作结果
   */
  async saveReport(reportData: any) {
    try {
      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("保存测试报告失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "保存测试报告失败"
      };
    }
  }
} 