"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { testCasesAPI } from "@/lib/api/test-cases"
import NewTestCasePage from "../../new/page"
import { use } from "react"
import type { TestCase } from "@/types/api"
import { useToast } from "@/components/ui/use-toast"

export default function EditTestCasePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [testCase, setTestCase] = useState<TestCase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resolvedParams = use(params)

  useEffect(() => {
    const fetchTestCase = async () => {
      try {
        setIsLoading(true)
        const data = await testCasesAPI.get(parseInt(resolvedParams.id))
        if (!data.test_case) {
          throw new Error("未找到测试用例")
        }
        
        // 确保script_content是正确的格式
        if (typeof data.test_case.script_content === 'string') {
          try {
            data.test_case.script_content = JSON.parse(data.test_case.script_content)
          } catch (e) {
            console.error("解析script_content失败:", e)
            toast({
              title: "警告",
              description: "测试用例数据格式有误，请谨慎编辑",
              variant: "destructive"
            })
          }
        }
        
        setTestCase(data.test_case)
      } catch (error) {
        console.error("获取测试用例失败:", error)
        const errorMessage = error instanceof Error ? error.message : "获取测试用例失败"
        setError(errorMessage)
        toast({
          title: "错误",
          description: errorMessage,
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestCase()
  }, [resolvedParams.id, toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !testCase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">{error || "未找到测试用例"}</p>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => router.push("/test-cases")}
          >
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return <NewTestCasePage initialData={testCase} mode="edit" />
} 