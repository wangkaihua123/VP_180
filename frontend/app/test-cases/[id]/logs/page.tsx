"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PageProps {
  params: Promise<{ id: string }>
}

// 模拟数据
const testCase = {
  id: 1,
  name: "登录功能",
  status: "失败",
  startTime: "2023-04-01 14:30:25",
  endTime: "2023-04-01 14:31:12",
  duration: "47秒",
  steps: [
    {
      id: 1,
      name: "导航到登录页面",
      status: "通过",
      duration: "0.5秒",
      logs: [
        { level: "info", timestamp: "14:30:25", message: "导航到 https://example.com/login" },
        { level: "info", timestamp: "14:30:26", message: "页面加载成功" },
      ],
    },
    {
      id: 2,
      name: "输入用户名",
      status: "通过",
      duration: "0.3秒",
      logs: [
        { level: "info", timestamp: "14:30:26", message: "在 #username 字段中输入用户名" },
        { level: "info", timestamp: "14:30:26", message: "用户名输入成功" },
      ],
    },
    {
      id: 3,
      name: "输入密码",
      status: "通过",
      duration: "0.2秒",
      logs: [
        { level: "info", timestamp: "14:30:27", message: "在 #password 字段中输入密码" },
        { level: "info", timestamp: "14:30:27", message: "密码输入成功" },
      ],
    },
    {
      id: 4,
      name: "点击登录按钮",
      status: "通过",
      duration: "0.4秒",
      logs: [
        { level: "info", timestamp: "14:30:28", message: "点击 #login-button" },
        { level: "info", timestamp: "14:30:28", message: "按钮点击成功" },
      ],
    },
    {
      id: 5,
      name: "验证重定向到仪表板",
      status: "失败",
      duration: "45秒",
      logs: [
        { level: "info", timestamp: "14:30:29", message: "等待重定向到仪表板" },
        { level: "warning", timestamp: "14:30:59", message: "重定向时间超出预期" },
        { level: "error", timestamp: "14:31:12", message: "等待重定向到仪表板超时" },
        { level: "error", timestamp: "14:31:12", message: "预期URL包含 '/dashboard'，实际得到 '/login?error=timeout'" },
      ],
    },
  ],
}

export default function TestLogsPage({ params }: PageProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([])

  const toggleStep = (stepId: number) => {
    setExpandedSteps((prev) => (prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "通过":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "失败":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "警告":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-500"
      case "warning":
        return "text-yellow-500"
      case "info":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  const passedSteps = testCase.steps.filter((step) => step.status === "通过").length
  const progress = (passedSteps / testCase.steps.length) * 100

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 bg-black text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 mr-2" asChild>
            <Link href="/test-cases">
              <ArrowLeft className="h-5 w-5 [&:hover]:text-white" />
              <span className="sr-only">返回</span>
            </Link>
          </Button>
          <h1 className="text-xl">
            <span className="font-bold text-white">优亿医疗</span>
            <span className="font-normal text-white text-sm ml-1">自动化测试平台</span>
            <span className="mx-2">-</span>
            <span>测试执行日志</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">{testCase.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>开始时间: {testCase.startTime}</span>
                <span>•</span>
                <span>持续时间: {testCase.duration}</span>
              </div>
            </div>

            <Badge
              variant={
                testCase.status === "通过"
                  ? "success"
                  : testCase.status === "失败"
                    ? "destructive"
                    : testCase.status === "警告"
                      ? "warning"
                      : "outline"
              }
              className="text-sm px-3 py-1"
            >
              {testCase.status}
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm">
              <span>进度</span>
              <span>
                {passedSteps} / {testCase.steps.length} 步骤通过
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {testCase.steps.map((step) => (
              <div key={step.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(step.status)}
                    <div>
                      <h3 className="font-medium">{step.name}</h3>
                      <p className="text-sm text-gray-500">持续时间: {step.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        step.status === "通过"
                          ? "success"
                          : step.status === "失败"
                            ? "destructive"
                            : step.status === "警告"
                              ? "warning"
                              : "outline"
                      }
                    >
                      {step.status}
                    </Badge>

                    {expandedSteps.includes(step.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400 [&:hover]:text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400 [&:hover]:text-gray-400" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSteps.includes(step.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Separator />
                      <ScrollArea className="h-[200px] p-4">
                        <div className="space-y-2 font-mono text-sm">
                          {step.logs.map((log, index) => (
                            <div key={index} className="flex">
                              <span className="text-gray-400 w-20">{log.timestamp}</span>
                              <span className={`${getLogLevelStyle(log.level)} w-16`}>[{log.level}]</span>
                              <span>{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

