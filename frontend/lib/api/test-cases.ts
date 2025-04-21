import { APIResponse } from "@/app/api/routes"
import { TestCase } from "@/app/api/routes"
import { fetchAPI } from "./api"

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

  run: async (id: number): Promise<APIResponse<void>> => {
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

  getLatestLogs: async (id: number): Promise<APIResponse<string>> => {
    return fetchAPI(`/api/test-cases/${id}/logs`, {
      method: "GET",
    })
  },
} 