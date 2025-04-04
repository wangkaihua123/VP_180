"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { testCaseAPI } from "@/lib/api"
import NewTestCasePage from "../../new/page"

export default function EditTestCasePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [testCase, setTestCase] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTestCase = async () => {
      try {
        const data = await testCaseAPI.get(parseInt(params.id))
        setTestCase(data)
      } catch (error) {
        console.error('Error fetching test case:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestCase()
  }, [params.id])

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!testCase) {
    return <div>未找到测试用例</div>
  }

  return <NewTestCasePage initialData={testCase} mode="edit" />
} 