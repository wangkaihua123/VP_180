/**
 * 测试用例执行页面
 * 
 * 该页面用于批量执行测试用例并实时显示执行结果：
 * - 支持从URL参数加载指定的测试用例
 * - 提供测试用例执行进度和状态的实时反馈
 * - 展示每个测试用例的详细日志
 * - 查看执行过程中的图片和截图
 * - 提供暂停、继续和导出日志等控制功能
 */
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
import { testCasesAPI, TestExecutionResponse } from "@/lib/api/test-cases"
import type { TestCase } from "@/app/api/routes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

/**
 * 测试用例状态类型
 */
type TestCaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/**
 * 测试用例日志接口
 */
interface TestCaseLog {
  id: number
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  testCaseId: number
}

/**
 * 带状态的测试用例接口
 */
interface TestCaseWithStatus extends TestCase {
  name: string
  color: string
  status: TestCaseStatus
}

/**
 * 测试图片接口
 */
interface TestImage {
  id: string
  testCaseId: number
  timestamp: string
  title: string
  description: string
  url: string
  type: 'image' | 'screenshot'
}

/**
 * 根据ID生成一致的颜色
 * @param id 测试用例ID
 * @returns 颜色字符串
 */
const getRandomColor = (id: number): string => {
  const colors = [
    "blue", "green", "purple", "orange", "teal", 
    "red", "indigo", "pink", "cyan", "amber"
  ];
  // 使用ID取模来获取一个固定的颜色
  return colors[id % colors.length];
}

/**
 * 测试用例执行页面组件
 */
export default function ExecuteAllPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [logs, setLogs] = useState<TestCaseLog[]>([])
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [systemLogLoading, setSystemLogLoading] = useState(false)
  const [activeLogTab, setActiveLogTab] = useState<'execution' | 'system'>('execution')
  const systemLogScrollAreaRef = useRef<HTMLDivElement>(null)
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
  const [testCaseImages, setTestCaseImages] = useState<{ [key: number]: TestImage[] }>({})
  const [testCaseScreenshots, setTestCaseScreenshots] = useState<{ [key: number]: TestImage[] }>({})
  const [selectedImage, setSelectedImage] = useState<TestImage | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const autoExecuteAttemptedRef = useRef(false)
  
  useEffect(() => {
    // 从 URL 参数中获取选中的测试用例 ID
    const ids = searchParams.get('ids')
    if (ids) {
      setSelectedIds(ids.split(',').map(id => parseInt(id)))
    }
    
    // 重置自动执行标记，确保页面每次加载时都能尝试自动执行
    autoExecuteAttemptedRef.current = false
  }, [searchParams])

  // 测试用例加载完成后的处理
  useEffect(() => {
    // 只在测试用例加载完成且未执行过的情况下自动执行
    if (!loading && testCases.length > 0 && !autoExecuteAttemptedRef.current && !executing) {
      console.log('测试用例加载完成，准备执行测试:', testCases.length, '个测试用例');
      // 设置标记防止重复执行
      autoExecuteAttemptedRef.current = true;
      
      // 延迟执行以确保UI更新完成
      setTimeout(() => {
        handleExecuteSelected();
      }, 100);
    }
  }, [loading, testCases, executing]);

  useEffect(() => {
    loadTestCases()
  }, [selectedIds])

  /**
   * 加载测试用例
   */
  const loadTestCases = async () => {
    try {
      setLoading(true)
      // 加载测试用例列表
      const response = await testCasesAPI.list()
      
      console.log("API返回测试用例数据:", response);
      
      if (response.success && (response.data || response.test_cases)) {
        // 处理API可能返回不同格式数据的情况
        const apiTestCases = response.data || response.test_cases || [];
        console.log("处理后的测试用例数据:", apiTestCases);
        
        if (apiTestCases && apiTestCases.length > 0) {
          // 如果有选中的测试用例，只显示选中的
          if (selectedIds.length > 0) {
            const filteredTestCases = apiTestCases
              .filter((tc: TestCase) => selectedIds.includes(tc.id))
              .map((tc: TestCase) => ({
                ...tc,
                name: tc.title || `测试用例 #${tc.id}`,
                color: getRandomColor(tc.id),
                status: mapStatus(tc.status)
              }));
            console.log("过滤后的测试用例:", filteredTestCases);
            setTestCases(filteredTestCases);
          } else {
            const formattedTestCases = apiTestCases.map((tc: TestCase) => ({
              ...tc,
              name: tc.title || `测试用例 #${tc.id}`,
              color: getRandomColor(tc.id),
              status: mapStatus(tc.status)
            }));
            console.log("所有测试用例:", formattedTestCases);
            setTestCases(formattedTestCases);
          }
        } else {
          console.warn("API返回了空的测试用例数组");
          setTestCases([]);
          toast({
            title: "无测试用例",
            description: "没有可执行的测试用例",
            variant: "destructive",
          });
        }
      } else {
        console.error("API返回错误:", response.message);
        setTestCases([]);
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

  /**
   * 切换测试用例展开/折叠状态
   * @param id 测试用例ID
   */
  const toggleTestCase = (id: number) => {
    setExpandedTestCases((prev) => (prev.includes(id) ? prev.filter((tcId) => tcId !== id) : [...prev, id]))
  }

  /**
   * 打开图片查看器
   * @param image 要查看的图片
   */
  const openImageViewer = (image: TestImage) => {
    setSelectedImage(image)
    setImageDialogOpen(true)
    setZoomLevel(1)
    setRotation(0)
  }

  /**
   * 切换到下一张图片
   */
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

  /**
   * 切换到上一张图片
   */
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

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current && isRunning) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [logs, isRunning])

  /**
   * 保存日志到文件
   */
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

  /**
   * 按测试用例ID过滤日志
   * @param testCaseId 测试用例ID
   * @returns 过滤后的日志数组
   */
  const getTestCaseLogs = (testCaseId: number) => {
    return logs.filter((log) => log.testCaseId === testCaseId)
  }

  /**
   * 添加日志条目
   * @param testCaseId 测试用例ID
   * @param message 日志消息
   * @param type 日志类型
   */
  const addLog = (testCaseId: number, message: string, type: TestCaseLog['type']) => {
    const newLog: TestCaseLog = {
      id: Date.now(),
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      message,
      type,
      testCaseId
    }
    setLogs(prev => [...prev, newLog])
  }

  /**
   * 将状态字符串映射为TestCaseStatus类型
   * @param status 状态字符串
   * @returns 标准化的测试用例状态
   */
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

  /**
   * 执行选中的测试用例
   */
  const handleExecuteSelected = async () => {
    if (executing) return

    setExecuting(true)
    setIsPaused(false)
    setLogs([]) // 确保清空之前的日志
    setProgress(0)
    setCompletedTestCases(0)
    
    // 添加执行开始的明确日志记录
    console.log('开始执行测试用例:', selectedIds)
    
    // 添加总体执行开始日志
    const startLog: TestCaseLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message: `开始执行 ${testCases.length} 个测试用例`,
      type: 'info',
      testCaseId: 0 // 0表示系统级日志
    }
    setLogs(prev => [...prev, startLog])

    // 复制当前测试用例数组以进行处理
    const cases = [...testCases]
    let completedCount = 0

    for (let i = 0; i < cases.length; i++) {
      // 如果暂停，则停止执行
      if (isPaused) {
        console.log('执行已暂停')
        addLog(0, '执行已暂停', 'warning')
        break
      }

      const testCase = cases[i]
      
      // 更新当前测试用例状态为"运行中"
      updateTestCaseStatus(testCase.id, 'running')
      
      // 添加开始执行此测试用例的日志
      addLog(testCase.id, `开始执行: ${testCase.name}`, 'info')
      console.log(`开始执行测试用例 #${testCase.id}:`, testCase.name)

      try {
        // 添加显式类型断言，因为API可能返回详细结果
        const result = await testCasesAPI.run(Number(testCase.id)) as TestExecutionResponse;
        
        if (result.success) {
          await updateTestCaseStatus(testCase.id, 'completed')
          addLog(testCase.id, `测试用例执行成功: ${testCase.name}`, 'success')
          
          // 记录操作步骤和验证步骤的详细结果
          if (result.details) {
            // 记录操作步骤结果
            if (result.details.operation_results && result.details.operation_results.length > 0) {
              addLog(testCase.id, '操作步骤结果:', 'info')
              result.details.operation_results.forEach((opResult, idx) => {
                const status = opResult.success ? '成功' : '失败'
                addLog(
                  testCase.id, 
                  `步骤 ${idx + 1}: ${status} - ${opResult.message || '无消息'}`, 
                  opResult.success ? 'success' : 'error'
                )
              })
            }
            
            // 记录验证步骤结果
            if (result.details.verification_results && result.details.verification_results.length > 0) {
              addLog(testCase.id, '验证步骤结果:', 'info')
              result.details.verification_results.forEach((verResult, idx) => {
                const status = verResult.success ? '通过' : '不通过'
                addLog(
                  testCase.id, 
                  `验证 ${idx + 1}: ${status} - ${verResult.message || '无消息'}`, 
                  verResult.success ? 'success' : 'error'
                )
              })
            } else {
              addLog(testCase.id, '没有验证步骤执行', 'warning')
            }
          }
          
          setExecutionStats(prev => ({
            ...prev,
            completed: prev.completed + 1
          }))
        } else {
          await updateTestCaseStatus(testCase.id, 'failed')
          addLog(testCase.id, `测试用例执行失败: ${testCase.name} - ${result.message}`, 'error')
          
          // 如果有详细错误信息，也一并记录
          if (result.details) {
            if (result.details.operation_results) {
              // 查找失败的操作步骤
              const failedOps = result.details.operation_results.filter(r => !r.success)
              if (failedOps.length > 0) {
                failedOps.forEach((op, idx) => {
                  addLog(testCase.id, `操作步骤失败 ${idx + 1}: ${op.message || '无错误信息'}`, 'error')
                })
              }
            }
            
            if (result.details.verification_results) {
              // 查找失败的验证步骤
              const failedVerifications = result.details.verification_results.filter(r => !r.success)
              if (failedVerifications.length > 0) {
                failedVerifications.forEach((ver, idx) => {
                  addLog(testCase.id, `验证步骤失败 ${idx + 1}: ${ver.message || '无错误信息'}`, 'error')
                })
              }
            }
          }
          
          setExecutionStats(prev => ({
            ...prev,
            failed: prev.failed + 1
          }))
        }
      } catch (error) {
        await updateTestCaseStatus(testCase.id, 'failed')
        addLog(testCase.id, `测试用例执行出错: ${testCase.name} - ${error instanceof Error ? error.message : '未知错误'}`, 'error')
        setExecutionStats(prev => ({
          ...prev,
          failed: prev.failed + 1
        }))
      }

      // 加载测试用例的图片和截图
      await loadTestCaseMedia(testCase.id)

      // 更新进度
      completedCount++;
      setCompletedTestCases(completedCount)
      setProgress(Math.floor((completedCount / cases.length) * 100))
    }

    setProgress(100) // 确保进度达到100%
  }

  /**
   * 更新测试用例状态
   * @param id 测试用例ID
   * @param status 新状态
   */
  const updateTestCaseStatus = async (id: number, status: string) => {
    // 更新本地状态
    setTestCases(prev => prev.map(tc => 
      tc.id === id ? { ...tc, status: mapStatus(status) } : tc
    ))
    
    // 同时更新后端数据库中的状态
    try {
      // 将状态映射为适合持久化的格式
      let persistStatus = status.toLowerCase();
      switch(persistStatus) {
        case 'running':
          persistStatus = '进行中';
          break;
        case 'completed':
          persistStatus = '通过';
          break;
        case 'failed':
          persistStatus = '失败';
          break;
        case 'skipped':
          persistStatus = '跳过';
          break;
        case 'pending':
          persistStatus = '未运行';
          break;
      }
      
      // 调用API更新状态
      console.log(`更新测试用例 ${id} 状态为: ${persistStatus}`);
      
      // 更新JSON文件中的状态
      const response = await testCasesAPI.updateStatus(id, persistStatus);
      
      if (!response.success) {
        console.error(`更新测试用例 ${id} 状态失败:`, response.message);
        toast({
          title: "状态更新失败",
          description: response.message || "无法更新测试用例状态",
          variant: "destructive",
        });
      } else {
        console.log(`测试用例 ${id} 状态已更新为 ${persistStatus}`);
      }
    } catch (error) {
      console.error(`更新测试用例 ${id} 状态出错:`, error);
      toast({
        title: "状态更新出错",
        description: error instanceof Error ? error.message : "更新状态时发生错误",
        variant: "destructive",
      });
    }
  }

  /**
   * 加载测试用例的图片和截图
   * @param testCaseId 测试用例ID
   */
  const loadTestCaseMedia = async (testCaseId: number) => {
    try {
      // 这里应该调用真实API获取图片和截图
      // 示例: const response = await testCasesAPI.getMedia(testCaseId)
      // 注意: 这里需要根据实际API实现
      
      // 目前使用空数组占位，实际项目中应替换为API调用
      setTestCaseImages(prev => ({
        ...prev,
        [testCaseId]: []
      }))
      
      setTestCaseScreenshots(prev => ({
        ...prev,
        [testCaseId]: []
      }))
    } catch (error) {
      console.error(`加载测试用例 ${testCaseId} 的媒体文件失败:`, error)
    }
  }

  /**
   * 获取日志类型的样式
   * @param type 日志类型
   * @returns CSS类名
   */
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

  /**
   * 获取测试用例状态的样式和图标
   * @param status 状态字符串
   * @returns Badge组件
   */
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

  /**
   * 重新执行测试用例
   */
  const handleReExecute = () => {
    // 重置执行状态
    setProgress(0);
    setCompletedTestCases(0);
    setLogs([]);
    setIsPaused(false);
    setExecutionStats({
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0
    });
    
    // 重置所有测试用例状态为待执行
    const updatedTestCases = testCases.map(tc => ({
      ...tc,
      status: 'pending' as TestCaseStatus
    }));
    setTestCases(updatedTestCases);
    
    // 重新执行测试用例
    handleExecuteSelected();
  };

  // 添加获取系统日志的函数
  const fetchSystemLogs = async () => {
    try {
      setSystemLogLoading(true)
      const response = await testCasesAPI.getSystemLog()
      
      if (response.success && response.data) {
        setSystemLogs(response.data)
        
        // 滚动到底部
        setTimeout(() => {
          if (systemLogScrollAreaRef.current && activeLogTab === 'system') {
            systemLogScrollAreaRef.current.scrollTop = systemLogScrollAreaRef.current.scrollHeight
          }
        }, 100)
      } else {
        console.error("获取系统日志失败:", response.message)
        toast({
          title: "获取系统日志失败",
          description: response.message || "无法获取系统日志",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("获取系统日志出错:", error)
    } finally {
      setSystemLogLoading(false)
    }
  }
  
  // 定期刷新系统日志
  useEffect(() => {
    fetchSystemLogs()
    
    // 创建定时器，每5秒刷新一次
    const intervalId = setInterval(() => {
      fetchSystemLogs()
    }, 5000)
    
    // 组件卸载时清除定时器
    return () => clearInterval(intervalId)
  }, [activeLogTab])

  // 系统日志级别样式
  const getSystemLogLevelStyle = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return "text-red-500 font-medium"
      case "WARNING":
        return "text-yellow-500"
      case "INFO":
        return "text-blue-500"
      case "DEBUG":
        return "text-cyan-500"
      case "TRACE":
        return "text-purple-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 页面头部 */}
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

      {/* 主要内容区域 */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* 测试执行进度卡片 */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  测试执行进度
                  {executing && (
                    <Badge variant="outline" className="ml-2 animate-pulse">
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      执行中
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* 重新执行按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReExecute}
                    disabled={executing && !isPaused}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新执行
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    disabled={!executing}
                  >
                    {!isPaused ? (
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={saveLogsToFile}
                    disabled={logs.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    导出日志
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 进度条 */}
              <div className="mb-2 flex justify-between text-sm">
                <span>总进度: {progress}%</span>
                <span>
                  {completedTestCases} / {testCases.length} 测试用例完成
                </span>
              </div>
              <Progress value={progress} className="h-2 mb-4" />

              {/* 测试用例列表及其状态 */}
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

                          {/* 日志选项卡 */}
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

                          {/* 图片选项卡 */}
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

                          {/* 截图选项卡 */}
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
                {executing ? "测试执行中..." : progress === 100 ? "测试执行完成" : "测试执行已暂停"}
              </div>
            </CardFooter>
          </Card>

          {/* 完整执行日志卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  完整执行日志
                </div>
                <div>
                  <Tabs value={activeLogTab} onValueChange={(value) => setActiveLogTab(value as 'execution' | 'system')}>
                    <TabsList>
                      <TabsTrigger value="execution" className="flex items-center">
                        <FileText className="mr-1 h-4 w-4" />
                        测试执行日志
                      </TabsTrigger>
                      <TabsTrigger value="system" className="flex items-center">
                        <FileText className="mr-1 h-4 w-4" />
                        系统日志 (VP_180.log)
                        {systemLogLoading && <RefreshCw className="ml-1 h-3 w-3 animate-spin" />}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeLogTab === 'execution' ? (
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
              ) : (
                <ScrollArea
                  className="h-[300px] rounded-md bg-black p-4 font-mono text-xs text-white"
                  ref={systemLogScrollAreaRef}
                >
                  {systemLogs.length > 0 ? (
                    systemLogs.map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                        <span className={getSystemLogLevelStyle(log.level)}>
                          [{log.level}]
                        </span>{" "}
                        <span className="text-gray-400">[{log.source}]</span>{" "}
                        <span className="text-white">{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {systemLogLoading ? "加载系统日志中..." : "暂无系统日志数据"}
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
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

