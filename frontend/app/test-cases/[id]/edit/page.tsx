"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { testCasesAPI } from "@/lib/api/test-cases"
import NewTestCasePage from "../../new/page"
import { use } from "react"
import type { TestCase } from "@/app/api/routes"

export default function EditTestCasePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [testCase, setTestCase] = useState<TestCase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resolvedParams = use(params)

  useEffect(() => {
    const fetchTestCase = async () => {
      try {
        const data = await testCasesAPI.get(parseInt(resolvedParams.id))
        setTestCase(data.test_case || null)
      } catch (error) {
        console.error("获取测试用例失败:", error)
        setError(error instanceof Error ? error.message : "获取测试用例失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestCase()
  }, [resolvedParams.id])

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!testCase) {
    return <div>未找到测试用例</div>
  }

  return <NewTestCasePage initialData={testCase} mode="edit" />
} 