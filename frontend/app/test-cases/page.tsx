/**
 * 测试用例列表页面
 * 
 * 该页面是应用的主要功能页面，用于展示和管理所有测试用例：
 * - 显示所有测试用例的列表
 * - 提供新建测试用例、执行所有测试用例的功能
 * - 支持通过顶部导航访问设置页面
 * - 使用TestCaseList组件展示测试用例详情
 * - 处理测试用例的加载状态和错误提示
 * - 支持选择和批量操作测试用例
 * - 展示最近一次测试用例执行结果
 */
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Play, Settings, RefreshCw } from "lucide-react"
import { TestCaseList } from "@/components/TestCaseList"
import { testCasesAPI } from "@/lib/api/test-cases"
import { useEffect, useState } from "react"
import { TestCase } from "../api/routes"
import { useToast } from "@/components/ui/use-toast"

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadTestCases()
  }, [])

  const loadTestCases = async () => {
    try {
      setLoading(true)
      const response = await testCasesAPI.list()
      
      if (response.success) {
        const testCasesData = response.test_cases || [];
        
        // 直接使用API返回的测试用例数据，包括status字段
        console.log("测试用例数据:", testCasesData);
        setTestCases(testCasesData);
      } else {
        toast({
          title: "加载失败",
          description: response.message || "无法加载测试用例",
          variant: "destructive",
        })
        setTestCases([])
      }
    } catch (error) {
      console.error("加载测试用例失败:", error)
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "加载测试用例失败",
        variant: "destructive",
      })
      setTestCases([])
    } finally {
      setLoading(false)
    }
  }
  
  // 刷新测试用例状态，获取最新执行结果
  const refreshTestResults = async () => {
    try {
      setRefreshing(true);
      await loadTestCases();
      toast({
        title: "刷新成功",
        description: "已获取最新测试结果",
      });
    } catch (error) {
      toast({
        title: "刷新失败",
        description: error instanceof Error ? error.message : "刷新测试结果失败",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunAll = async () => {
    // 跳转到执行页面并设置自动执行参数
    router.push('/execute-all?autoExecute=true');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 bg-black text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl">
              <span className="font-bold text-white">优亿医疗</span>
              <span className="font-normal text-white text-sm ml-1">自动化测试平台</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
              <Link href="/login">
                <span className="sr-only">退出登录</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">测试用例</h2>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="group"
              onClick={refreshTestResults}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '刷新中...' : '刷新结果'}
            </Button>
            <Link href="/settings">
              <Button variant="outline" className="group">
                <Settings className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                设置
              </Button>
            </Link>
            <Button variant="outline" className="group" onClick={handleRunAll}>
              <Play className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
              全部执行
            </Button>
            <Link href="/test-cases/new">
              <Button className="group bg-black text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                新建用例
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
          {!loading && (!testCases || testCases.length === 0) ? (
            <div className="text-center py-4">暂无测试用例</div>
          ) : (
            <TestCaseList 
              testCases={testCases || []}
              loading={loading}
              onRefresh={loadTestCases}
              selectedIds={selectedIds || []}
              onSelectionChange={setSelectedIds}
              enableSelection={true}
            />
          )}
        </div>
      </main>
    </div>
  )
} 