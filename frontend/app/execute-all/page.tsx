"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  ImageIcon,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  X,
  ArrowLeftIcon,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { TestCaseList } from "@/components/TestCaseList"
import { testCasesAPI } from "@/lib/api/test-cases"
import type { TestCase } from "@/app/api/routes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

type TestCaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

interface TestCaseLog {
  id: number
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  testCaseId: number
}

interface TestCaseWithStatus extends TestCase {
  name: string
  color: string
  status: TestCaseStatus
}

// 根据ID生成一致的颜色
const getRandomColor = (id: number): string => {
  const colors = [
    "blue", "green", "purple", "orange", "teal", 
    "red", "indigo", "pink", "cyan", "amber"
  ];
  // 使用ID取模来获取一个固定的颜色
  return colors[id % colors.length];
}

// 模拟测试用例数据
const testCases = [
  { id: 1, name: "登录功能", type: "功能测试", status: "进行中", color: "blue" },
  { id: 2, name: "用户注册", type: "功能测试", status: "等待中", color: "green" },
  { id: 3, name: "支付处理", type: "集成测试", status: "等待中", color: "purple" },
  { id: 4, name: "数据导出", type: "性能测试", status: "等待中", color: "orange" },
  { id: 5, name: "API响应时间", type: "性能测试", status: "等待中", color: "teal" },
]

// 生成随机日志消息
const generateLogMessage = (testCaseId: number) => {
  const testCase = testCases.find((tc) => tc.id === testCaseId)
  const actions = [
    "初始化测试环境",
    "加载测试数据",
    "执行前置条件",
    "点击元素",
    "输入文本",
    "验证元素存在",
    "验证文本内容",
    "等待元素可见",
    "截取屏幕截图",
    "检查API响应",
    "验证数据库记录",
    "清理测试数据",
    "关闭测试连接",
  ]

  const results = [
    "成功",
    "完成",
    "通过",
    "失败: 元素未找到",
    "失败: 超时",
    "失败: 断言错误",
    "警告: 响应时间过长",
    "警告: 资源使用率高",
  ]

  const action = actions[Math.floor(Math.random() * actions.length)]
  const result = results[Math.floor(Math.random() * results.length)]
  const isError = result.includes("失败")
  const isWarning = result.includes("警告")

  const type: TestCaseLog['type'] = isError ? "error" : isWarning ? "warning" : "info"

  const log: TestCaseLog = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    message: `${action} - ${result}`,
    type,
    testCaseId,
  }
  return log
}

// 模拟图片和截图数据
const generateMockImages = (testCaseId: number) => {
  // 为每个测试用例生成2-5张图片
  const count = Math.floor(Math.random() * 4) + 2
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${testCaseId}-${i}`,
    testCaseId,
    timestamp: new Date(Date.now() - i * 30000).toISOString().replace("T", " ").substring(0, 19),
    title: `测试图片 ${i + 1}`,
    description: `测试用例 #${testCaseId} 的图片 ${i + 1}`,
    url: `/placeholder.svg?height=400&width=600&text=测试图片${i + 1}`,
    type: "image",
  }))
}

const generateMockScreenshots = (testCaseId: number) => {
  // 为每个测试用例生成3-7张截图
  const count = Math.floor(Math.random() * 5) + 3
  return Array.from({ length: count }, (_, i) => ({
    id: `scr-${testCaseId}-${i}`,
    testCaseId,
    timestamp: new Date(Date.now() - i * 20000).toISOString().replace("T", " ").substring(0, 19),
    title: `截图 ${i + 1}`,
    description: `测试步骤 ${i + 1} 的截图`,
    url: `/placeholder.svg?height=1080&width=1920&text=测试截图${i + 1}`,
    type: "screenshot",
  }))
}

const mapStatus = (status: string): TestCaseStatus => {
  switch (status) {
    case '进行中':
      return 'running'
    case '通过':
      return 'completed'
    case '失败':
      return 'failed'
    case '跳过':
      return 'skipped'
    default:
      return 'pending'
  }
}

export default function ExecuteAllPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [logs, setLogs] = useState<TestCaseLog[]>([])
  const [testCases, setTestCases] = useState<TestCaseWithStatus[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [executing, setExecuting] = useState(false)
  const [executionOrder, setExecutionOrder] = useState<'sequential' | 'parallel'>('sequential')
  const [executionTimeout, setExecutionTimeout] = useState(30000)
  const [currentTestCase, setCurrentTestCase] = useState<TestCaseWithStatus | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [executionStats, setExecutionStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    skipped: 0
  })
  const [testCaseStatus, setTestCaseStatus] = useState<TestCaseWithStatus[]>([])
  const [isRunning, setIsRunning] = useState(true)
  const [progress, setProgress] = useState(0)
  const [expandedTestCases, setExpandedTestCases] = useState<number[]>([1])
  const [completedTestCases, setCompletedTestCases] = useState(0)
  const [testCaseImages, setTestCaseImages] = useState<{ [key: number]: any[] }>({})
  const [testCaseScreenshots, setTestCaseScreenshots] = useState<{ [key: number]: any[] }>({})
  const [selectedImage, setSelectedImage] = useState<any>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    // 从 URL 参数中获取选中的测试用例 ID
    const ids = searchParams.get('ids')
    if (ids) {
      setSelectedIds(ids.split(',').map(id => parseInt(id)))
    }
  }, [searchParams])

  // 新增：检查是否需要自动执行测试用例
  useEffect(() => {
    // 检查URL参数中是否有autoExecute=true
    const autoExecute = searchParams.get('autoExecute') === 'true'
    
    // 如果需要自动执行且测试用例已加载完成且未在执行中
    if (autoExecute && !loading && !executing && testCases.length > 0) {
      // 自动执行测试用例
      handleExecuteSelected();
    }
  }, [searchParams, loading, testCases, executing]);

  // 初始化图片和截图数据
  useEffect(() => {
    const images: { [key: number]: any[] } = {}
    const screenshots: { [key: number]: any[] } = {}

    testCases.forEach((tc) => {
      images[tc.id] = generateMockImages(tc.id)
      screenshots[tc.id] = generateMockScreenshots(tc.id)
    })

    setTestCaseImages(images)
    setTestCaseScreenshots(screenshots)
  }, [testCases])

  useEffect(() => {
    loadTestCases()
  }, [selectedIds])

  const loadTestCases = async () => {
    try {
      setLoading(true)
      // 加载测试用例列表
      const response = await testCasesAPI.list()
      
      if (response.success && response.data) {
        // 如果有选中的测试用例，只显示选中的
        if (selectedIds.length > 0) {
          const filteredTestCases = response.data
            .filter((tc: TestCase) => selectedIds.includes(tc.id))
            .map(tc => ({
              ...tc,
              name: tc.title,
              color: getRandomColor(tc.id),
              status: mapStatus(tc.status)
            }));
          setTestCases(filteredTestCases);
          // 同步设置 testCaseStatus 状态
          setTestCaseStatus(filteredTestCases);
        } else {
          const formattedTestCases = response.data.map(tc => ({
            ...tc,
            name: tc.title,
            color: getRandomColor(tc.id),
            status: mapStatus(tc.status)
          }));
          setTestCases(formattedTestCases);
          // 同步设置 testCaseStatus 状态
          setTestCaseStatus(formattedTestCases);
        }
      } else {
        setTestCases([]);
        setTestCaseStatus([]);
        toast({
          title: "加载失败",
          description: response.message || "无法加载测试用例",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("加载测试用例失败:", error);
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "加载测试用例失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // 切换测试用例展开/折叠状态
  const toggleTestCase = (id: number) => {
    setExpandedTestCases((prev) => (prev.includes(id) ? prev.filter((tcId) => tcId !== id) : [...prev, id]))
  }

  // 打开图片查看器
  const openImageViewer = (image: any) => {
    setSelectedImage(image)
    setImageDialogOpen(true)
    setZoomLevel(1)
    setRotation(0)
  }

  // 切换到下一张图片
  const nextImage = () => {
    if (!selectedImage) return

    const allImages = [...Object.values(testCaseImages).flat(), ...Object.values(testCaseScreenshots).flat()]

    const currentIndex = allImages.findIndex((img) => img.id === selectedImage.id)
    if (currentIndex < allImages.length - 1) {
      setSelectedImage(allImages[currentIndex + 1])
      setZoomLevel(1)
      setRotation(0)
    }
  }

  // 切换到上一张图片
  const prevImage = () => {
    if (!selectedImage) return

    const allImages = [...Object.values(testCaseImages).flat(), ...Object.values(testCaseScreenshots).flat()]

    const currentIndex = allImages.findIndex((img) => img.id === selectedImage.id)
    if (currentIndex > 0) {
      setSelectedImage(allImages[currentIndex - 1])
      setZoomLevel(1)
      setRotation(0)
    }
  }

  // 模拟测试执行过程
  useEffect(() => {
    if (!isRunning) return
    
    if (testCases.length > 0 && testCaseStatus.length === 0) {
      // 确保 testCaseStatus 被初始化
      setTestCaseStatus([...testCases]);
    }

    // 模拟测试用例执行顺序和状态变化
    const runTestCases = async () => {
      // 第一个测试用例已经在进行中
      let currentTestCaseIndex = 0

      while (currentTestCaseIndex < testCases.length && isRunning) {
        const currentTestCase = testCases[currentTestCaseIndex]

        // 更新当前测试用例状态为"进行中"
        setTestCaseStatus((prev) => prev.map((tc) => (tc.id === currentTestCase.id ? { ...tc, status: "running" } : tc)))

        // 模拟测试用例执行时间 (3-8秒)
        const executionTime = Math.floor(Math.random() * 5000) + 3000
        const startTime = Date.now()
        const logInterval = setInterval(() => {
          // 每隔一段时间添加一条日志
          const newLog = generateLogMessage(currentTestCase.id)
          setLogs((prev) => [...prev, newLog])

          // 更新进度
          const elapsed = Date.now() - startTime
          const testCaseProgress = Math.min(elapsed / executionTime, 1)
          const overallProgress = (currentTestCaseIndex + testCaseProgress) / testCases.length
          setProgress(Math.floor(overallProgress * 100))
        }, 500)

        // 等待测试用例执行完成
        await new Promise((resolve) => setTimeout(resolve, executionTime))
        clearInterval(logInterval)

        // 随机决定测试结果 (80%成功率)
        const isSuccess = Math.random() < 0.8

        // 更新测试用例状态
        setTestCaseStatus((prev) =>
          prev.map((tc) => (tc.id === currentTestCase.id ? { ...tc, status: isSuccess ? "completed" : "failed" } : tc)),
        )

        // 添加测试结果日志
        setLogs((prev) => [
          ...prev,
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
            message: `测试用例 "${currentTestCase.name}" ${isSuccess ? "执行成功" : "执行失败"}`,
            type: isSuccess ? "success" : "error",
            testCaseId: currentTestCase.id,
          },
        ])

        // 更新已完成测试用例数量
        setCompletedTestCases((prev) => prev + 1)

        // 移动到下一个测试用例
        currentTestCaseIndex++

        // 如果还有下一个测试用例，更新其状态为"进行中"
        if (currentTestCaseIndex < testCases.length) {
          const nextTestCase = testCases[currentTestCaseIndex]
          setTestCaseStatus((prev) => prev.map((tc) => (tc.id === nextTestCase.id ? { ...tc, status: "running" } : tc)))

          // 自动展开当前执行的测试用例
          setExpandedTestCases((prev) => (prev.includes(nextTestCase.id) ? prev : [...prev, nextTestCase.id]))
        } else {
          // 所有测试用例执行完成
          setIsRunning(false)
          setProgress(100)
        }
      }
    }

    runTestCases()

    return () => {
      // 清理函数
    }
  }, [isRunning])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current && isRunning) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [logs, isRunning])

  // 获取日志类型的样式
  const getLogTypeStyle = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-500 font-medium"
      case "warning":
        return "text-yellow-500"
      case "success":
        return "text-green-500 font-medium"
      case "info":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  // 获取测试用例状态的样式和图标
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-4 h-4 mr-1" />等待中</Badge>
      case 'running':
        return <Badge variant="default"><Play className="w-4 h-4 mr-1" />执行中</Badge>
      case 'completed':
      case '通过':
        return <Badge variant="success"><CheckCircle className="w-4 h-4 mr-1" />通过</Badge>
      case 'failed':
      case '失败':
        return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" />失败</Badge>
      case 'skipped':
        return <Badge variant="secondary"><ArrowRight className="w-4 h-4 mr-1" />跳过</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 保存日志到文件
  const saveLogsToFile = () => {
    const content = logs.map((log) => `[${log.timestamp}] [测试用例 #${log.testCaseId}] ${log.message}`).join("\n")

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `test-execution-logs-${new Date().toISOString().replace(/:/g, "-")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 按测试用例ID过滤日志
  const getTestCaseLogs = (testCaseId: number) => {
    return logs.filter((log) => log.testCaseId === testCaseId)
  }

  const addLog = (testCaseId: number, message: string, type: TestCaseLog['type']) => {
    const newLog: TestCaseLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type,
      testCaseId
    }
    setLogs(prev => [...prev, newLog])
  }

  const handleExecuteSelected = async () => {
    if (executing) return

    setExecuting(true)
    setIsPaused(false)
    setLogs([])
    setExecutionStats({
      total: selectedIds.length || testCases.length,
      completed: 0,
      failed: 0,
      skipped: 0
    })

    // 重置所有测试用例状态为待执行
    setTestCaseStatus(prev =>
      prev.map(tc => ({
        ...tc,
        status: 'pending'
      }))
    )

    try {
      if (executionOrder === 'sequential') {
        // 串行执行
        for (const id of (selectedIds.length > 0 ? selectedIds : testCases.map(tc => tc.id))) {
          if (isPaused) break

          const testCase = testCases.find(tc => tc.id === id)
          if (!testCase) continue

          // 更新状态为执行中
          updateTestCaseStatus(id, 'running')
          addLog(id, `开始执行测试用例: ${testCase.name}`, 'info')

          try {
            const result = await testCasesAPI.run(Number(id))
            if (result.success) {
              updateTestCaseStatus(id, 'completed')
              addLog(id, `测试用例执行成功: ${testCase.name}`, 'success')
              setExecutionStats(prev => ({
                ...prev,
                completed: prev.completed + 1
              }))
            } else {
              updateTestCaseStatus(id, 'failed')
              addLog(id, `测试用例执行失败: ${testCase.name} - ${result.message}`, 'error')
              setExecutionStats(prev => ({
                ...prev,
                failed: prev.failed + 1
              }))
            }
          } catch (error) {
            updateTestCaseStatus(id, 'failed')
            addLog(id, `测试用例执行出错: ${testCase.name} - ${error instanceof Error ? error.message : '未知错误'}`, 'error')
            setExecutionStats(prev => ({
              ...prev,
              failed: prev.failed + 1
            }))
          }

          // 等待一小段时间再执行下一个
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } else {
        // 并行执行
        const idsToExecute = selectedIds.length > 0 ? selectedIds : testCases.map(tc => tc.id)
        const promises = idsToExecute.map(async id => {
          const testCase = testCases.find(tc => tc.id === id)
          if (!testCase) return

          updateTestCaseStatus(id, 'running')
          addLog(id, `开始执行测试用例: ${testCase.name}`, 'info')

          try {
            const result = await testCasesAPI.run(Number(id))
            if (result.success) {
              updateTestCaseStatus(id, 'completed')
              addLog(id, `测试用例执行成功: ${testCase.name}`, 'success')
              setExecutionStats(prev => ({
                ...prev,
                completed: prev.completed + 1
              }))
            } else {
              updateTestCaseStatus(id, 'failed')
              addLog(id, `测试用例执行失败: ${testCase.name} - ${result.message}`, 'error')
              setExecutionStats(prev => ({
                ...prev,
                failed: prev.failed + 1
              }))
            }
          } catch (error) {
            updateTestCaseStatus(id, 'failed')
            addLog(id, `测试用例执行出错: ${testCase.name} - ${error instanceof Error ? error.message : '未知错误'}`, 'error')
            setExecutionStats(prev => ({
              ...prev,
              failed: prev.failed + 1
            }))
          }
        })

        await Promise.all(promises)
      }
    } finally {
      setExecuting(false)
    }
  }

  const updateTestCaseStatus = (id: number, status: string) => {
    setTestCaseStatus(prev => prev.map(tc => 
      tc.id === id ? { ...tc, status: mapStatus(status) } : tc
    ))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 bg-black text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 mr-2" asChild>
            <Link href="/test-cases">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">返回</span>
            </Link>
          </Button>
          <h1 className="text-xl">
            <span className="font-bold text-white">优亿医疗</span>
            <span className="font-normal text-white text-sm ml-1">自动化测试平台</span>
            <span className="mx-2">-</span>
            <span>执行测试</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  测试执行进度
                  {isRunning && (
                    <Badge variant="outline" className="ml-2 animate-pulse">
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      执行中
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRunning(!isRunning)}
                    disabled={progress === 100}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        继续
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveLogsToFile}>
                    <Download className="mr-2 h-4 w-4" />
                    导出日志
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex justify-between text-sm">
                <span>总进度: {progress}%</span>
                <span>
                  {completedTestCases} / {testCases.length} 测试用例完成
                </span>
              </div>
              <Progress value={progress} className="h-2 mb-4" />

              <div className="space-y-2">
                {testCases.map((testCase) => (
                  <Collapsible
                    key={testCase.id}
                    open={expandedTestCases.includes(testCase.id)}
                    onOpenChange={() => toggleTestCase(testCase.id)}
                    className="border rounded-md overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: testCase.color }} />
                        <span className="font-medium">
                          测试用例 #{testCase.id}: {testCase.name}
                        </span>
                        {getStatusBadge(testCase.status)}
                      </div>
                      {expandedTestCases.includes(testCase.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-3 bg-black/5">
                        <Tabs defaultValue="logs" className="w-full">
                          <TabsList className="mb-3">
                            <TabsTrigger value="logs" className="flex items-center">
                              <FileText className="mr-1 h-4 w-4" />
                              日志
                            </TabsTrigger>
                            <TabsTrigger value="images" className="flex items-center">
                              <ImageIcon className="mr-1 h-4 w-4" />
                              图片 ({testCaseImages[testCase.id]?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="screenshots" className="flex items-center">
                              <Camera className="mr-1 h-4 w-4" />
                              截图 ({testCaseScreenshots[testCase.id]?.length || 0})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="logs">
                            <ScrollArea className="h-[200px] rounded-md bg-black p-4 font-mono text-xs text-white">
                              {getTestCaseLogs(testCase.id).length > 0 ? (
                                getTestCaseLogs(testCase.id).map((log, index) => (
                                  <div key={index} className="mb-1">
                                    <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                                    <span className={getLogTypeStyle(log.type)}>{log.message}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500">暂无日志</div>
                              )}
                            </ScrollArea>
                          </TabsContent>

                          <TabsContent value="images">
                            {testCaseImages[testCase.id]?.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {testCaseImages[testCase.id].map((image) => (
                                  <div
                                    key={image.id}
                                    className="border rounded-md overflow-hidden bg-white cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => openImageViewer(image)}
                                  >
                                    <div className="relative h-40">
                                      <Image
                                        src={image.url || "/placeholder.svg"}
                                        alt={image.title}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="p-2">
                                      <h4 className="font-medium text-sm">{image.title}</h4>
                                      <p className="text-xs text-gray-500">{image.timestamp}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">暂无图片</div>
                            )}
                          </TabsContent>

                          <TabsContent value="screenshots">
                            {testCaseScreenshots[testCase.id]?.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {testCaseScreenshots[testCase.id].map((screenshot) => (
                                  <div
                                    key={screenshot.id}
                                    className="border rounded-md overflow-hidden bg-white cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => openImageViewer(screenshot)}
                                  >
                                    <div className="relative h-40">
                                      <Image
                                        src={screenshot.url || "/placeholder.svg"}
                                        alt={screenshot.title}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="p-2">
                                      <h4 className="font-medium text-sm">{screenshot.title}</h4>
                                      <p className="text-xs text-gray-500">{screenshot.timestamp}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">暂无截图</div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="text-sm text-muted-foreground">
                {isRunning ? "测试执行中..." : progress === 100 ? "测试执行完成" : "测试执行已暂停"}
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                完整执行日志
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea
                className="h-[300px] rounded-md bg-black p-4 font-mono text-xs text-white"
                ref={scrollAreaRef}
              >
                {logs.map((log, index) => {
                  const testCase = testCases.find((tc) => tc.id === log.testCaseId)
                  return (
                    <div key={index} className="mb-1">
                      <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                      <span className="px-1 rounded" style={{ backgroundColor: `${testCase?.color}40` }}>
                        [测试用例 #{log.testCaseId}]
                      </span>{" "}
                      <span className={getLogTypeStyle(log.type)}>{log.message}</span>
                    </div>
                  )
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex justify-between items-center mt-6">
          <h2 className="text-2xl font-bold">批量执行测试用例</h2>
          <Button
            onClick={handleExecuteSelected}
            disabled={executing || testCases.length === 0}
          >
            {executing ? "执行中..." : "执行选中"}
          </Button>
        </div>

        <TestCaseList
          testCases={testCases}
          loading={loading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRefresh={loadTestCases}
        />
      </main>

      {/* 图片查看器对话框 */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-gray-800">
          <div className="relative">
            <DialogClose className="absolute right-2 top-2 z-10">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>

            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <div className="text-white">
                <h3 className="font-medium">{selectedImage?.title}</h3>
                <p className="text-sm text-gray-400">{selectedImage?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))}
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 0.1, 3))}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setRotation((prev) => prev + 90)}
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    setZoomLevel(1)
                    setRotation(0)
                  }}
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="relative h-[70vh] flex items-center justify-center overflow-auto">
              {selectedImage && (
                <div
                  className="relative"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease",
                  }}
                >
                  <Image
                    src={selectedImage.url || "/placeholder.svg"}
                    alt={selectedImage.title}
                    width={800}
                    height={600}
                    className="max-w-none"
                  />
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={prevImage}
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={nextImage}
              >
                <ArrowRight className="h-6 w-6" />
              </Button>
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-between items-center">
              <div className="text-white text-sm">
                {selectedImage?.timestamp}
                <span className="ml-2 px-2 py-0.5 rounded bg-gray-700 text-xs">
                  {selectedImage?.type === "image" ? "图片" : "截图"}
                </span>
              </div>
              <div className="text-white text-sm">
                缩放: {Math.round(zoomLevel * 100)}% | 旋转: {rotation}°
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

