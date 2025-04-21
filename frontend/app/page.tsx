"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * 主页组件
 * 
 * 功能：自动重定向到测试用例页面
 * 所有测试用例功能已迁移到 /test-cases 路径下
 */
export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // 自动重定向到测试用例页面
    router.push('/test-cases')
  }, [router])
  
  // 返回一个空的div，实际内容不会显示因为会被重定向
  return <div></div>
}

