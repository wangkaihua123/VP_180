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
  Minus,
  Plus,
  Square, // 添加停止按钮图标
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
import { API_BASE_URL } from "@/lib/constants"
import type { TestCase } from "@/app/api/routes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

/**
 * 测试用例状态类型
 */
type TestCaseStatus = 'pending' | 'completed' | 'failed' | 'error'

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
 * 系统日志接口
 */
interface SystemLog {
  timestamp: string
  level: string
  source: string
  message: string
  content?: string
  msg?: string
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
 * 转换图片路径为API路径
 * @param url 原始URL
 * @returns 转换后的URL
 */
const convertImageUrlToApiPath = (url: string): string => {
  console.log('转换前的URL:', url);
  
  // 如果URL为空，则返回占位符
  if (!url) {
    console.log('URL为空，返回占位符');
    return "/placeholder.svg";
  }
  
  // 如果已经是API路径，则直接返回
  if (url.startsWith('/api/files/')) {
    console.log('URL已经是API路径格式，直接返回:', url);
    return url;
  }
  
  let apiUrl = url;
  
  // 根据原始URL模式转换为API路径
  if (url.includes('/data/img/')) {
    const filename = url.split('/').pop() || '';
    apiUrl = `/api/files/images/${filename}`;
    console.log('从/data/img/路径转换:', url, ' -> ', apiUrl);
  } else if (url.includes('/data/screenshots/')) {
    const filename = url.split('/').pop() || '';
    apiUrl = `/api/files/screenshots/${filename}`;
    console.log('从/data/screenshots/路径转换:', url, ' -> ', apiUrl);
  } else if (url.includes('/img/')) {
    const filename = url.split('/').pop() || '';
    apiUrl = `/api/files/images/${filename}`;
    console.log('从/img/路径转换:', url, ' -> ', apiUrl);
  } else if (url.includes('/screenshot/')) {
    const filename = url.split('/').pop() || '';
    apiUrl = `/api/files/screenshots/${filename}`;
    console.log('从/screenshot/路径转换:', url, ' -> ', apiUrl);
  } else if (url.startsWith('/api/images/')) {
    // 处理旧API路径格式
    const filename = url.split('/').pop() || '';
    apiUrl = `/api/files/images/${filename}`;
    console.log('从旧API路径格式转换:', url, ' -> ', apiUrl);
  } else if (url.startsWith('/api/screenshots/')) {
    // 处理旧API路径格式
    const filename = url.split('/').pop() || '';
    apiUrl = `/api/files/screenshots/${filename}`;
    console.log('从旧API路径格式转换:', url, ' -> ', apiUrl);
  }
  
  console.log('转换后的URL:', apiUrl);
  return apiUrl;
}

/**
 * 测试用例执行页面组件
 */
export default function ExecuteAllPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [logs, setLogs] = useState<TestCaseLog[]>([])
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([])
  const [systemLogLoading, setSystemLogLoading] = useState(false)
  const systemLogScrollAreaRef = useRef<HTMLDivElement>(null)
  const [pollInterval, setPollInterval] = useState(2000) // 初始轮询间隔为2秒
  const [noNewLogCount, setNoNewLogCount] = useState(0) // 连续无新日志的次数
  const lastLogCountRef = useRef(0) // 上次日志数量的引用
  const timerRef = useRef<NodeJS.Timeout | null>(null) // 定时器引用
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
  const [expandedTestCases, setExpandedTestCases] = useState<number[]>([])
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
    if (searchParams) {
      const ids = searchParams.get('ids')
      const autoExecute = searchParams.get('autoExecute')
      const timestamp = searchParams.get('t')
      
      if (ids) {
        setSelectedIds(ids.split(',').map(id => parseInt(id)))
      }
      
      // 如果有时间戳参数但没有autoExecute参数，说明是从其他页面跳转来的
      // 此时也应该自动执行测试用例
      if (timestamp && !autoExecute) {
        // 启用自动执行
        autoExecuteAttemptedRef.current = false;
      } else if (autoExecute === 'true') {
        // 原有的autoExecute逻辑
        autoExecuteAttemptedRef.current = false;
      } else {
        // 不自动执行，仅显示结果
        autoExecuteAttemptedRef.current = true;
      }
    } else {
      // searchParams为null时，加载所有测试用例，不自动执行
      setSelectedIds([])
      autoExecuteAttemptedRef.current = true;
    }
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
  
  // 单独的useEffect钩子，用于确保第一个测试用例自动展开
  useEffect(() => {
    if (!loading && testCases.length > 0) {
      const firstTestCaseId = testCases[0].id;
      console.log('自动展开第一个测试用例:', firstTestCaseId);
      
      // 确保展开状态设置正确
      setExpandedTestCases(prev => {
        // 如果已经包含这个ID，则不需要再添加
        if (prev.includes(firstTestCaseId)) {
          console.log('第一个测试用例已经展开');
          return prev;
        }
        console.log('添加第一个测试用例到展开列表');
        return [...prev, firstTestCaseId];
      });
    }
  }, [loading, testCases]);

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
                status: 'pending' as TestCaseStatus
              }));
            console.log("过滤后的测试用例:", filteredTestCases);
            setTestCases(filteredTestCases);
          } else {
            const formattedTestCases = apiTestCases.map((tc: TestCase) => ({
              ...tc,
              name: tc.title || `测试用例 #${tc.id}`,
              color: getRandomColor(tc.id),
              status: 'pending' as TestCaseStatus
            }));
            console.log("所有测试用例:", formattedTestCases);
            setTestCases(formattedTestCases);
          }
          
          // 如果有测试用例，自动展开第一个测试用例
          if (apiTestCases.length > 0 && expandedTestCases.length === 0) {
            const firstTestCaseId = apiTestCases[0].id;
            setExpandedTestCases([firstTestCaseId]);
            console.log('自动展开第一个测试用例:', firstTestCaseId);
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


  useEffect(() => {
    if (imageDialogOpen) {
      setZoomLevel(1);
    }
  }, [imageDialogOpen]);

  /**
   * 打开图片查看器
   * @param image 要查看的图片
   */
  const openImageViewer = (image: TestImage) => {
    console.log('打开图片查看器 - 原始图片:', image);
    
    // 转换图片路径，确保使用API路径而不是直接路径
    const modifiedImage = { ...image };
    
    // 确保URL不为空
    if (!modifiedImage.url) {
      console.error('图片URL为空，无法打开查看器');
      toast({
        title: "图片查看失败",
        description: "图片URL无效",
        variant: "destructive",
      });
      return;
    }
    
    // 确保URL使用API_BASE_URL
    if (typeof modifiedImage.url === 'string' && !modifiedImage.url.includes(API_BASE_URL)) {
      console.log(`修正图片URL: 添加API_BASE_URL (${API_BASE_URL})`);
      // 如果URL以/开头，则直接拼接，否则添加/
      modifiedImage.url = modifiedImage.url.startsWith('/') 
        ? `${API_BASE_URL}${modifiedImage.url}`
        : `${API_BASE_URL}/${modifiedImage.url}`;
    }
    
    console.log('打开图片查看器 - 处理后的图片URL:', modifiedImage.url);
    
    // 设置缩放级别为默认值
    setZoomLevel(1);
    setSelectedImage(modifiedImage);
    setImageDialogOpen(true);
    setRotation(0);
    
    // 添加延迟检查，确认图片是否成功加载
    setTimeout(() => {
      console.log('图片查看器已打开，当前selectedImage:', selectedImage);
    }, 100);
  }

  /**
   * 切换到下一张图片
   */
  const nextImage = () => {
    if (!selectedImage) return

    const allImages = [...Object.values(testCaseImages).flat(), ...Object.values(testCaseScreenshots).flat()]
    console.log('切换到下一张图片 - 所有图片数量:', allImages.length);

    const currentIndex = allImages.findIndex((img) => img.id === selectedImage.id)
    console.log('当前图片索引:', currentIndex);
    
    if (currentIndex < allImages.length - 1) {
      const nextImg = allImages[currentIndex + 1];
      console.log('下一张图片:', nextImg);
      
      // 直接使用下一张图片的对象，不做额外的路径转换
      setSelectedImage(nextImg)
      setRotation(0)
      console.log('已切换到下一张图片:', nextImg);
    }
  }

  /**
   * 切换到上一张图片
   */
  const prevImage = () => {
    if (!selectedImage) return

    const allImages = [...Object.values(testCaseImages).flat(), ...Object.values(testCaseScreenshots).flat()]
    console.log('切换到上一张图片 - 所有图片数量:', allImages.length);

    const currentIndex = allImages.findIndex((img) => img.id === selectedImage.id)
    console.log('当前图片索引:', currentIndex);
    
    if (currentIndex > 0) {
      const prevImg = allImages[currentIndex - 1];
      console.log('上一张图片:', prevImg);
      
      // 直接使用上一张图片的对象，不做额外的路径转换
      setSelectedImage(prevImg)
      setRotation(0)
      console.log('已切换到上一张图片:', prevImg);
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
      case '异常':
        return 'error'
      case '通过':
        return 'completed'
      case '失败':
        return 'failed'
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
    
    // 清空系统日志文件
    try {
      console.log('清空系统日志文件...')
      const clearResult = await testCasesAPI.clearSystemLog()
      if (clearResult.success) {
        console.log('系统日志文件已清空')
      } else {
        console.warn('清空系统日志文件失败:', clearResult.message)
        toast({
          title: "清空系统日志失败",
          description: clearResult.message || "无法清空系统日志文件",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('清空系统日志文件出错:', error)
    }
    
    // 清空图片和截图目录
    try {
      console.log('清空图片和截图目录...')
      const clearImagesResult = await testCasesAPI.clearImages()
      if (clearImagesResult.success) {
        console.log('图片和截图目录已清空')
        addLog(0, '已清空图片和截图目录', 'info')
      } else {
        console.warn('清空图片和截图目录失败:', clearImagesResult.message)
        toast({
          title: "清空图片和截图目录失败",
          description: clearImagesResult.message || "无法清空图片和截图目录",
          variant: "destructive",
        })
        addLog(0, `清空图片和截图目录失败: ${clearImagesResult.message}`, 'error')
      }
    } catch (error) {
      console.error('清空图片和截图目录出错:', error)
      addLog(0, `清空图片和截图目录出错: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
    }
    
    // 确定要执行的测试用例
    let casesToExecute = [...testCases];
    
    // 如果有选择的测试用例ID，则只执行被选中的测试用例
    if (selectedIds.length > 0) {
      casesToExecute = testCases.filter(testCase => selectedIds.includes(testCase.id));
      console.log('根据选择的ID过滤测试用例:', selectedIds);
      console.log('要执行的测试用例数量:', casesToExecute.length);
    }
    
    // 添加执行开始的明确日志记录
    console.log('开始执行测试用例:', selectedIds.length > 0 ? selectedIds : '所有测试用例')
    
    // 添加总体执行开始日志
    const startLog: TestCaseLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message: `开始执行 ${casesToExecute.length} 个测试用例`,
      type: 'info',
      testCaseId: 0 // 0表示系统级日志
    }
    setLogs(prev => [...prev, startLog])

    let completedCount = 0

    for (let i = 0; i < casesToExecute.length; i++) {
      const testCase = casesToExecute[i]
      
      // 添加开始执行此测试用例的日志
      addLog(testCase.id, `开始执行: ${testCase.name}`, 'info')
      console.log(`开始执行测试用例 #${testCase.id}:`, testCase.name)

      try {
        // 添加显式类型断言，因为API可能返回详细结果
        const result = await testCasesAPI.run(Number(testCase.id)) as TestExecutionResponse;
        
        if (result.success) {
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
          
          // 检查验证步骤是否全部通过
          let allVerificationsSuccess = true;
          if (result.details && result.details.verification_results) {
            allVerificationsSuccess = result.details.verification_results.every(v => v.success);
          }
          
          if (allVerificationsSuccess) {
            // 所有验证步骤通过，更新状态为通过
            testCase.status = 'completed';
            // 更新状态到后端
            testCasesAPI.updateStatus(testCase.id, '通过')
              .then(response => {
                if (response.success) {
                  console.log(`测试用例 #${testCase.id} 状态更新为"通过"成功`);
                } else {
                  console.error(`测试用例 #${testCase.id} 状态更新为"通过"失败:`, response.message);
                }
              })
              .catch(error => {
                console.error(`测试用例 #${testCase.id} 状态更新出错:`, error);
              });
          } else {
            // 有验证步骤失败，更新状态为失败
            testCase.status = 'failed';
            // 更新状态到后端
            testCasesAPI.updateStatus(testCase.id, '失败')
              .then(response => {
                if (response.success) {
                  console.log(`测试用例 #${testCase.id} 状态更新为"失败"成功`);
                } else {
                  console.error(`测试用例 #${testCase.id} 状态更新为"失败"失败:`, response.message);
                }
              })
              .catch(error => {
                console.error(`测试用例 #${testCase.id} 状态更新出错:`, error);
              });
          }
          
          setExecutionStats(prev => ({
            ...prev,
            completed: prev.completed + 1
          }))
        } else {
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
          
          // 更新状态为失败
          testCase.status = 'failed';
          // 更新状态到后端
          testCasesAPI.updateStatus(testCase.id, '失败')
            .then(response => {
              if (response.success) {
                console.log(`测试用例 #${testCase.id} 状态更新为"失败"成功`);
              } else {
                console.error(`测试用例 #${testCase.id} 状态更新为"失败"失败:`, response.message);
              }
            })
            .catch(error => {
              console.error(`测试用例 #${testCase.id} 状态更新出错:`, error);
            });
          
          setExecutionStats(prev => ({
            ...prev,
            failed: prev.failed + 1
          }))
        }
      } catch (error) {
        addLog(testCase.id, `测试用例执行出错: ${testCase.name} - ${error instanceof Error ? error.message : '未知错误'}`, 'error')
        
        // 更新状态为异常
        testCase.status = 'error';
        // 更新状态到后端
        testCasesAPI.updateStatus(testCase.id, '异常')
          .then(response => {
            if (response.success) {
              console.log(`测试用例 #${testCase.id} 状态更新为"异常"成功`);
            } else {
              console.error(`测试用例 #${testCase.id} 状态更新为"异常"失败:`, response.message);
            }
          })
          .catch(error => {
            console.error(`测试用例 #${testCase.id} 状态更新出错:`, error);
          });
        
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
      setProgress(Math.floor((completedCount / casesToExecute.length) * 100))
    }

    setProgress(100) // 确保进度达到100%
    setExecuting(false) // 设置执行状态为完成
  }

  /**
   * 生成测试报告
   */
  const handleGenerateReport = async () => {
    try {
      console.log('开始生成测试报告...')
      
      // 统计通过和失败的测试用例
      const passedCases = testCases.filter(tc => tc.status === 'completed').length
      const failedCases = testCases.filter(tc => tc.status === 'failed' || tc.status === 'error').length
      const totalCases = testCases.length
      const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0

      // 构建测试报告数据
      const reportData = {
        project: 'VP-180项目',
        date: new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        passRate: passRate,
        totalCases: totalCases,
        passedCases: passedCases,
        failedCases: failedCases,
        modulesPerformance: [
          { name: '用户体验', passRate: 98, passed: Math.round(passedCases * 0.2), failed: Math.round(failedCases * 0.1) },
          { name: '智能搜索', passRate: 95, passed: Math.round(passedCases * 0.15), failed: Math.round(failedCases * 0.2) },
          { name: '订单引擎', passRate: 85, passed: Math.round(passedCases * 0.3), failed: Math.round(failedCases * 0.4) },
          { name: '支付生态', passRate: 94, passed: Math.round(passedCases * 0.1), failed: Math.round(failedCases * 0.1) },
          { name: '用户反馈', passRate: 92, passed: Math.round(passedCases * 0.15), failed: Math.round(failedCases * 0.1) },
          { name: '智能库存', passRate: 83, passed: Math.round(passedCases * 0.1), failed: Math.round(failedCases * 0.1) }
        ],
        failedTestCases: testCases
          .filter(tc => tc.status === 'failed' || tc.status === 'error')
          .map(tc => ({
            id: `TC-${tc.id.toString().padStart(3, '0')}`,
            type: tc.type || '未分类',
            name: tc.name || tc.title || `测试用例 #${tc.id}`,
            errorMsg: '测试验证失败',
            status: '失败'
          })),
        environment: {
          testEnv: 'UAT 环境',
          server: '16 CPU, 64GB RAM',
          database: 'MySQL 8.0.28',
          apiVersion: 'v2.3.5'
        },
        generatedTime: new Date().toLocaleString('zh-CN'),
        team: '优亿测试开发部',
        testCases: testCases.map(tc => ({
          id: tc.id,
          title: tc.title,
          name: tc.name,
          type: tc.type,
          status: tc.status,
          color: tc.color
        })),
        logs: logs
      }
      
      // 保存测试报告数据
      const saveResult = await testCasesAPI.saveReport(reportData)
      if (saveResult.success) {
        console.log('测试报告已保存:', saveResult)
        addLog(0, '测试报告已生成并保存', 'success')
        toast({
          title: "测试报告已生成",
          description: "测试报告已成功生成并保存",
        })
      } else {
        console.error('保存测试报告失败:', saveResult.message)
        addLog(0, `保存测试报告失败: ${saveResult.message}`, 'error')
        toast({
          title: "保存测试报告失败",
          description: saveResult.message || "无法保存测试报告",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('生成测试报告出错:', error)
      addLog(0, `生成测试报告出错: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
      toast({
        title: "生成测试报告失败",
        description: error instanceof Error ? error.message : "生成测试报告时发生未知错误",
        variant: "destructive",
      })
    }
  }

  /**
   * 加载测试用例的图片和截图
   * @param testCaseId 测试用例ID
   */
  const loadTestCaseMedia = async (testCaseId: number) => {
    try {
      // 调用API获取最新日志，包含图片和截图URL
      const response = await testCasesAPI.getLatestLog(testCaseId);
      
      if (response.success && response.data) {
        // 从/img目录中获取图片
        try {
          // 获取从本地匹配id_{testCaseId}_*.png的图片文件列表
          const localImagesResponse = await fetch(`/api/files/images/list?testCaseId=${testCaseId}`);
          if (!localImagesResponse.ok) {
            throw new Error(`获取本地图片列表失败: ${localImagesResponse.statusText}`);
          }
          
          const localImagesData = await localImagesResponse.json();
          console.log(`测试用例 ${testCaseId} 的图片列表数据:`, localImagesData);
          
          // 使用API返回的图片详情
          const imageDetails = localImagesData.imageDetails || [];
          
          // 处理本地图片
          const testImages: TestImage[] = [];
          imageDetails.forEach((imageDetail: any) => {
            // 检查文件名是否符合格式：id_{步骤ID}_*.png
            const filename = imageDetail.name;
            const idMatch = filename.match(/^id_(\d+)_/);
            if (idMatch) {
              const stepId = parseInt(idMatch[1]);
              
              // 尝试从文件名中提取时间戳，如果无法提取则使用当前时间
              // 假设文件名格式可能包含时间信息，如id_1_20230415120000.png
              const timestampMatch = filename.match(/_(\d{14})/);
              let timestamp = imageDetail.lastModified || new Date().toISOString();
              if (timestampMatch && timestampMatch[1]) {
                // 尝试将提取的时间字符串转换为日期格式
                try {
                  const timeStr = timestampMatch[1];
                  // 格式: 年(4)月(2)日(2)时(2)分(2)秒(2)
                  const year = timeStr.substring(0, 4);
                  const month = timeStr.substring(4, 6);
                  const day = timeStr.substring(6, 8);
                  const hour = timeStr.substring(8, 10);
                  const minute = timeStr.substring(10, 12);
                  const second = timeStr.substring(12, 14);
                  
                  const formattedTime = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                  timestamp = new Date(formattedTime).toISOString();
                } catch (e) {
                  console.warn('无法从文件名解析时间戳:', filename);
                }
              }
              
              // 创建图片对象，使用API返回的路径，但添加后端基础URL
              // 确保使用完整的后端URL，而不是相对路径
              const apiPath = imageDetail.path.startsWith('/') 
                ? `${API_BASE_URL}${imageDetail.path}` 
                : `${API_BASE_URL}/${imageDetail.path}`;
              
              console.log(`构建图片URL: 原始路径=${imageDetail.path}, 完整URL=${apiPath}`);
              
              testImages.push({
                id: filename,
                testCaseId: testCaseId,
                timestamp: timestamp,
                title: `步骤 ${stepId} 图片`,
                description: `测试用例 ${testCaseId} 步骤 ${stepId} 的图片`,
                url: apiPath, // 使用带有后端基础URL的完整路径
                type: 'image'
              });
              
              console.log(`添加图片: ${filename}, 路径: ${apiPath}, 子目录: ${imageDetail.subDir || 'root'}`);
            }
          });
          
          console.log(`测试用例 ${testCaseId} 从本地加载到 ${testImages.length} 张图片`);
          
          // 更新状态
          setTestCaseImages(prev => ({
            ...prev,
            [testCaseId]: testImages
          }));
        } catch (imgError) {
          console.error(`加载本地图片失败:`, imgError);
        }
        
        // 从/screenshot目录中获取截图
        try {
          // 获取从本地匹配id_{testCaseId}_*.png/tiff/jpg的截图文件列表
          const localScreenshotsResponse = await fetch(`/api/files/screenshots/list?testCaseId=${testCaseId}`);
          if (!localScreenshotsResponse.ok) {
            throw new Error(`获取本地截图列表失败: ${localScreenshotsResponse.statusText}`);
          }
          
          const localScreenshotsData = await localScreenshotsResponse.json();
          console.log(`测试用例 ${testCaseId} 的截图列表数据:`, localScreenshotsData);
          
          // 使用API返回的截图详情
          const screenshotDetails = localScreenshotsData.imageDetails || [];
          
          // 处理本地截图
          const testScreenshots: TestImage[] = [];
          screenshotDetails.forEach((screenshotDetail: any) => {
            // 检查文件名是否符合格式：id_{步骤ID}_*.png/tiff/jpg
            const filename = screenshotDetail.name;
            const idMatch = filename.match(/^id_(\d+)_/);
            if (idMatch) {
              const stepId = parseInt(idMatch[1]);
              
              // 尝试从文件名中提取时间戳，如果无法提取则使用当前时间
              const timestampMatch = filename.match(/_(\d{14})/);
              let timestamp = screenshotDetail.lastModified || new Date().toISOString();
              if (timestampMatch && timestampMatch[1]) {
                // 尝试将提取的时间字符串转换为日期格式
                try {
                  const timeStr = timestampMatch[1];
                  // 格式: 年(4)月(2)日(2)时(2)分(2)秒(2)
                  const year = timeStr.substring(0, 4);
                  const month = timeStr.substring(4, 6);
                  const day = timeStr.substring(6, 8);
                  const hour = timeStr.substring(8, 10);
                  const minute = timeStr.substring(10, 12);
                  const second = timeStr.substring(12, 14);
                  
                  const formattedTime = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                  timestamp = new Date(formattedTime).toISOString();
                } catch (e) {
                  console.warn('无法从文件名解析时间戳:', filename);
                }
              }
              
              // 创建截图对象，使用API返回的路径，但添加后端基础URL
              // 确保使用完整的后端URL，而不是相对路径
              const apiPath = screenshotDetail.path.startsWith('/') 
                ? `${API_BASE_URL}${screenshotDetail.path}` 
                : `${API_BASE_URL}/${screenshotDetail.path}`;
              
              console.log(`构建截图URL: 原始路径=${screenshotDetail.path}, 完整URL=${apiPath}`);
              
              testScreenshots.push({
                id: filename,
                testCaseId: testCaseId,
                timestamp: timestamp,
                title: `步骤 ${stepId} 截图`,
                description: `测试用例 ${testCaseId} 步骤 ${stepId} 的截图`,
                url: apiPath, // 使用带有后端基础URL的完整路径
                type: 'screenshot'
              });
              
              console.log(`添加截图: ${filename}, 路径: ${apiPath}`);
            }
          });
          
          console.log(`测试用例 ${testCaseId} 从本地加载到 ${testScreenshots.length} 张截图`);
          
          // 更新截图状态
          setTestCaseScreenshots(prev => ({
            ...prev,
            [testCaseId]: testScreenshots
          }));
        } catch (screenshotError) {
          console.error(`加载本地截图失败:`, screenshotError);
        }
      } else {
        console.error(`加载测试用例 ${testCaseId} 的媒体文件失败:`, response.message);
      }
    } catch (error) {
      console.error(`加载测试用例 ${testCaseId} 的媒体文件失败:`, error);
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
        return <Badge variant="outline"><Clock className="w-4 h-4 mr-1" />未执行</Badge>
      case 'error':
      case '异常':
        return <Badge variant="secondary"><Play className="w-4 h-4 mr-1" />异常</Badge>
      case 'completed':
      case '通过':
        return <Badge variant="success"><CheckCircle className="w-4 h-4 mr-1" />通过</Badge>
      case 'failed':
      case '失败':
        return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" />失败</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  /**
   * 重新加载执行页面
   */
  const handleReload = () => {
    if (selectedIds.length > 0) {
      // 添加一个时间戳作为额外参数，确保页面被重新加载而不是从缓存加载
      const timestamp = new Date().getTime();
      // 使用window.location.href强制浏览器完全刷新页面
      window.location.href = `/execute-all?ids=${selectedIds.join(',')}&t=${timestamp}`;
    } else {
      // 如果没有选中的测试用例ID，直接重新加载页面
      window.location.href = '/execute-all';
    }
  };

  /**
   * 重新执行测试用例
   */
  const handleReExecute = () => {
    // 构建新的URL，添加autoExecute=true参数
    const timestamp = new Date().getTime();
    let newUrl = '/execute-all';
    
    // 如果有选中的测试用例ID，添加到URL中
    if (selectedIds.length > 0) {
      newUrl += `?ids=${selectedIds.join(',')}`;
    }
    
    // 添加autoExecute=true参数
    newUrl += `${selectedIds.length > 0 ? '&' : '?'}autoExecute=true&t=${timestamp}`;
    
    // 使用window.location.href强制浏览器完全刷新页面
    window.location.href = newUrl;
  };

  /**
   * 停止执行测试用例
   */
  const handleStopExecution = () => {
    // 添加日志记录测试执行被手动停止
    addLog(0, "测试执行被手动停止", "warning");
    console.log("测试执行被手动停止");
    
    // 将所有处于pending状态的测试用例更新为已终止状态
    const updatedTestCases = testCases.map(tc => {
      if (tc.status === 'pending') {
        // 更新到后端
        testCasesAPI.updateStatus(tc.id, '已终止')
          .then(response => {
            if (response.success) {
              console.log(`测试用例 #${tc.id} 状态更新为"已终止"成功`);
            } else {
              console.error(`测试用例 #${tc.id} 状态更新为"已终止"失败:`, response.message);
            }
          })
          .catch(error => {
            console.error(`测试用例 #${tc.id} 状态更新出错:`, error);
          });
          
        // 返回更新后的测试用例对象
        return {
          ...tc,
          status: 'error' as TestCaseStatus // 将状态标记为error，以在UI中显示为已终止
        };
      }
      return tc;
    });
    
    // 更新状态
    setTestCases(updatedTestCases);
    setExecuting(false);
    
    // 显示toast通知
    toast({
      title: "测试停止",
      description: "测试执行已手动停止",
      variant: "default",
    });
  };

  // 添加获取系统日志的函数
  const fetchSystemLogs = async () => {
    try {
      setSystemLogLoading(true)
      const response = await testCasesAPI.getSystemLog()
      
      if (response.success && response.data) {
        // 打印原始日志数据以进行调试
        console.log('原始日志数据示例:', response.data.slice(-1));
        
        // 处理日志数据，确保包含所有必要字段
        const processedLogs: SystemLog[] = response.data.map((rawLog: any) => {
          // 打印单条日志的所有字段
          console.log('原始日志字段:', Object.keys(rawLog));
          
          // 获取日志消息，尝试所有可能的字段名
          const logMessage = 
            rawLog.message || 
            rawLog.content || 
            rawLog.msg || 
            rawLog.text || 
            rawLog.log_message || 
            rawLog.description || 
            '';
          
          return {
            timestamp: rawLog.timestamp || new Date().toISOString(),
            level: rawLog.level || rawLog.severity || 'INFO',
            source: rawLog.source || rawLog.logger || rawLog.module || '',
            message: logMessage
          };
        });
        
        // 打印处理后的日志示例
        console.log('处理后的日志示例:', processedLogs.slice(-1));
        
        // 如果有新日志，打印示例以便调试
        if (processedLogs.length > 0 && processedLogs.length !== lastLogCountRef.current) {
          console.log('系统日志格式示例 (新增日志):', 
            processedLogs.slice(-3).map((log: SystemLog) => ({
              level: log.level,
              source: log.source,
              message: log.message
            }))
          );
        }
        
        // 获取当前日志数量
        const currentLogCount = processedLogs.length;
        
        // 比较与上次日志数量
        if (currentLogCount > lastLogCountRef.current) {
          // 有新日志
          setNoNewLogCount(0); // 重置无新日志计数
          
          // 如果当前轮询间隔是10秒，改回2秒
          if (pollInterval === 10000) {
            console.log('检测到新日志，轮询间隔调整为2秒');
            setPollInterval(2000);
          }
        } else {
          // 无新日志，增加计数
          setNoNewLogCount(prev => {
            const newCount = prev + 1;
            
            // 如果连续五次无新日志且当前轮询间隔是2秒，改为10秒
            if (newCount >= 8 && pollInterval === 2000) {
              console.log('连续八次无新日志，轮询间隔调整为10秒');
              setPollInterval(10000);
            }
            
            return newCount;
          });
        }
        
        // 更新上次日志数量
        lastLogCountRef.current = currentLogCount;
        
        // 设置处理后的日志数据
        setSystemLogs(processedLogs);
        
        // 根据日志更新测试用例状态
        updateTestCaseStatusFromLogs(processedLogs);
        
        // 滚动到底部
        setTimeout(() => {
          if (systemLogScrollAreaRef.current) {
            systemLogScrollAreaRef.current.scrollTop = systemLogScrollAreaRef.current.scrollHeight;
          }
        }, 100);
      } else {
        console.error("获取系统日志失败:", response.message);
        toast({
          title: "获取系统日志失败",
          description: response.message || "无法获取系统日志",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("获取系统日志出错:", error);
    } finally {
      setSystemLogLoading(false);
    }
  };
  
  /**
   * 将前端状态映射为后端状态
   * @param frontendStatus 前端状态
   * @returns 后端状态
   */
  const mapStatusToBackend = (frontendStatus: TestCaseStatus): string => {
    switch (frontendStatus) {
      case 'completed':
        return '通过';
      case 'failed':
        return '失败';
      case 'error':
        return '异常';
      case 'pending':
        return '未运行';
      default:
        return '未运行';
    }
  };

  /**
   * 根据系统日志更新测试用例状态
   * 检查日志中是否包含"结果: 测试通过"或"结果: 测试不通过"
   * @param logs 系统日志数组
   */
  const updateTestCaseStatusFromLogs = (logs: any[]) => {
    // 如果没有测试用例或日志，则直接返回
    if (testCases.length === 0 || logs.length === 0) return;
    
    console.log('根据系统日志更新测试用例状态...');
    
    // 创建测试用例副本以进行状态更新
    const updatedTestCases = [...testCases];
    
    // 遍历所有测试用例
    updatedTestCases.forEach(testCase => {
      // 保存原始状态用于比较
      const originalStatus = testCase.status;
      
      // 获取与此测试用例相关的日志
      const testCaseLogs = getTestCaseSystemLogsByRange(testCase.id);
      if (testCaseLogs.length === 0) return;
      
      // 默认为异常状态，如果有执行日志但没有明确的通过/不通过结果
      let hasExecutionLogs = false;
      
      // 查找包含结果信息的日志
      for (const log of testCaseLogs) {
        const logMessage = log.message || '';
        hasExecutionLogs = true;
        
        // 检查日志中是否包含测试结果信息
        if (logMessage.includes('结果: 测试通过')) {
          console.log(`从日志中检测到测试用例 #${testCase.id} 通过`);
          testCase.status = 'completed';
          break;
        } else if (logMessage.includes('结果: 测试不通过')) {
          console.log(`从日志中检测到测试用例 #${testCase.id} 不通过`);
          testCase.status = 'failed';
          break;
        }
      }
      
      // 如果有执行日志但没有明确的通过/不通过结果，则设为异常状态
      if (hasExecutionLogs && testCase.status !== 'completed' && testCase.status !== 'failed') {
        console.log(`测试用例 #${testCase.id} 没有明确的结果，设置为异常状态`);
        testCase.status = 'error';
      }
      
      // 如果状态有变化，同步到后端
      if (originalStatus !== testCase.status) {
        const backendStatus = mapStatusToBackend(testCase.status);
        console.log(`更新测试用例 #${testCase.id} 状态到后端: ${backendStatus}`);
        
        // 异步调用API更新后端状态
        testCasesAPI.updateStatus(testCase.id, backendStatus)
          .then(response => {
            if (response.success) {
              console.log(`测试用例 #${testCase.id} 状态更新成功`);
            } else {
              console.error(`测试用例 #${testCase.id} 状态更新失败:`, response.message);
            }
          })
          .catch(error => {
            console.error(`测试用例 #${testCase.id} 状态更新出错:`, error);
          });
      }
    });
    
    // 更新测试用例状态
    setTestCases(updatedTestCases);
  }

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

  /**
   * 获取特定测试用例的系统日志
   * @param testCaseId 测试用例ID
   * @returns 与该测试用例相关的系统日志
   */
  const getTestCaseSystemLogs = (testCaseId: number) => {
    // 从systemLogs数组中过滤包含特定测试用例ID的日志
    // 测试用例ID可能出现在日志的source或message字段中
    return systemLogs.filter(log => {
      // 组合source和message以进行全文搜索
      const logText = `${log.source || ''} ${log.message || ''}`.toLowerCase();
      
      // 添加更多可能的匹配模式
      return logText.includes(`#${testCaseId}`) || 
             // 匹配"当前执行测试用例名称: XXX，测试用例ID: 数字"格式
             logText.includes(`测试用例id: ${testCaseId}`) ||
             logText.includes(`，测试用例id: ${testCaseId}`) ||
             // 特别检查是否包含"测试用例ID"字符串，不区分大小写
             (logText.includes("测试用例id") && logText.includes(testCaseId.toString()));
    });
  };

  /**
   * 获取特定测试用例的系统日志（按区间）
   * 从该测试用例开始执行到下一个测试用例开始执行之前的所有日志
   * @param testCaseId 测试用例ID
   * @returns 该测试用例执行期间的所有系统日志
   */
  const getTestCaseSystemLogsByRange = (testCaseId: number) => {
    if (systemLogs.length === 0) return [];
    
    // 查找所有测试用例开始执行的位置
    const testCaseStartIndices: { id: number; index: number }[] = [];
    
    systemLogs.forEach((log, index) => {
      const logText = `${log.source || ''} ${log.message || ''}`.toLowerCase();
      // 查找测试用例开始执行的标记
      if (logText.includes("当前执行测试用例名称")) {
        // 尝试提取测试用例ID
        const match = logText.match(/测试用例id:\s*(\d+)/i);
        if (match && match[1]) {
          const id = parseInt(match[1], 10);
          if (!isNaN(id)) {
            testCaseStartIndices.push({ id, index });
          }
        }
      }
    });
    
    // 按日志索引排序
    testCaseStartIndices.sort((a, b) => a.index - b.index);
    
    // 找到目标测试用例的开始索引
    const targetIndex = testCaseStartIndices.findIndex(item => item.id === testCaseId);
    if (targetIndex === -1) return []; // 未找到该测试用例
    
    const startIndex = testCaseStartIndices[targetIndex].index;
    // 如果有下一个测试用例，结束索引为下一个测试用例的开始索引，否则为日志末尾
    const endIndex = targetIndex < testCaseStartIndices.length - 1 
      ? testCaseStartIndices[targetIndex + 1].index
      : systemLogs.length;
    
    // 返回区间内的所有日志
    return systemLogs.slice(startIndex, endIndex);
  };

  // 添加一个useEffect来定期刷新图片
  useEffect(() => {
    // 只在执行过程中刷新
    if (executing && !isPaused) {
      console.log('开始定期刷新测试用例图片');
      // 创建一个定时器，每5秒更新一次图片
      const timer = setInterval(() => {
        // 获取当前正在执行的测试用例ID
        testCases.forEach(tc => {
          if (tc.status === 'completed' || tc.status === 'error' || tc.status === 'failed') {
            loadTestCaseMedia(tc.id);
          }
        });
      }, 5000);
      
      return () => {
        console.log('停止刷新测试用例图片');
        clearInterval(timer);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executing, isPaused, JSON.stringify(testCases)]);

  // 定期刷新系统日志
  useEffect(() => {
    // 只在执行测试用例时进行轮询
    if (!executing) {
      console.log('测试用例未在执行中，不启动日志轮询');
      return;
    }
    
    console.log('启动系统日志轮询...');
    
    // 首次加载时获取日志
    fetchSystemLogs();
    
    // 创建轮询函数
    const poll = () => {
      // 清除现有定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // 检查是否所有测试用例都已完成
      const allTestCasesCompleted = testCases.every(tc => 
        tc.status === 'completed' || tc.status === 'failed' || tc.status === 'error'
      );
      
      // 如果所有测试用例都已完成，且测试用例数量不为0，则停止轮询
      if (allTestCasesCompleted && testCases.length > 0) {
        console.log('所有测试用例已完成，停止日志轮询');
        // 最后再获取一次日志确保获取到所有内容
        fetchSystemLogs();
        return;
      }
      
      // 设置新的定时器
      timerRef.current = setTimeout(() => {
        fetchSystemLogs().then(() => {
          // 递归调用poll，形成循环
          poll();
        });
      }, pollInterval);
    };
    
    // 开始轮询
    poll();
    
    // 组件卸载时清除定时器
    return () => {
      console.log('清除日志轮询定时器');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executing, testCases, pollInterval]); // 当executing状态变化或测试用例状态变化时重新设置轮询

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">执行测试用例</h2>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* 测试执行进度卡片 */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  测试执行进度
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* 停止执行按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopExecution}
                    disabled={!executing}
                    className="text-red-500 hover:bg-red-50 border-red-200"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    停止执行
                  </Button>
                  {/* 重新执行按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReload}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新执行
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
                      </div>
                      {expandedTestCases.includes(testCase.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-3 bg-black/5">
                        <Tabs defaultValue="systemLogs" className="w-full">
                          <TabsList className="mb-3">
                            <TabsTrigger value="systemLogs" className="flex items-center">
                              <FileText className="mr-1 h-4 w-4" />
                              系统日志 ({getTestCaseSystemLogsByRange(testCase.id).length})
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

                          {/* 系统日志选项卡 */}
                          <TabsContent value="systemLogs">
                            <ScrollArea className="h-[300px] rounded-md bg-black p-4 font-mono text-xs text-white">
                              {getTestCaseSystemLogsByRange(testCase.id).length > 0 ? (
                                getTestCaseSystemLogsByRange(testCase.id).map((log, index) => (
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
                                <div className="text-gray-500">
                                  {systemLogs.length > 0 ? 
                                    `暂无与测试用例 #${testCase.id} (${testCase.name}) 相关的系统日志 (总日志数: ${systemLogs.length})` : 
                                    "暂无系统日志"}
                                </div>
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
                                    <div className="relative h-40 flex items-center justify-center overflow-hidden bg-gray-50">
                                      <div className="w-full h-full flex items-center justify-center">
                                        <img
                                          src={image.url || "/placeholder.svg"}
                                          alt={image.title}
                                          className="max-h-full max-w-full object-contain"
                                          style={{
                                            transform: 'scale(1)',
                                            transformOrigin: 'center center'
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="p-2">
                                      <h4 className="font-medium text-sm">{image.id}</h4>
                                      <p className="text-xs text-gray-500">
                                        {new Date(image.timestamp).toLocaleString('zh-CN', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })}
                                      </p>
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
                                    <div className="relative h-40 flex items-center justify-center overflow-hidden bg-gray-50">
                                      <div className="w-full h-full flex items-center justify-center">
                                        <img
                                          src={screenshot.url || "/placeholder.svg"}
                                          alt={screenshot.title}
                                          className="max-h-full max-w-full object-contain"
                                          style={{
                                            transform: 'scale(0.6)',
                                            transformOrigin: 'center center'
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="p-2">
                                      <h4 className="font-medium text-sm">{screenshot.id}</h4>
                                      <p className="text-xs text-gray-500">
                                        {new Date(screenshot.timestamp).toLocaleString('zh-CN', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })}
                                      </p>
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
            
          </Card>

          {/* 完整执行日志卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  完整执行日志
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    轮询间隔: {pollInterval === 2000 ? '2秒' : '10秒'}
                    {pollInterval === 10000 && noNewLogCount >= 8 && ' (空闲)'}
                  </span>
                  {systemLogLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea
                className="h-[400px] rounded-md bg-black p-4 font-mono text-xs text-white"
                ref={systemLogScrollAreaRef}
              >
                {systemLogs.length > 0 ? (
                  systemLogs.map((log: SystemLog, index: number) => (
                    <div key={index} className="mb-1 whitespace-pre-wrap break-all">
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
            </CardContent>
          </Card>

          {/* 测试执行结果统计卡片 */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  测试执行结果统计
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={executing || testCases.length === 0}
                  className="flex items-center"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  生成测试报告
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 总用例数 */}
                <div className="bg-gray-100 rounded-lg p-6 text-center">
                  <div className="text-6xl font-bold">{testCases.length}</div>
                  <div className="text-gray-500 mt-2">总用例数</div>
                </div>

                {/* 通过数 */}
                <div className="bg-green-100 rounded-lg p-6 text-center">
                  <div className="text-6xl font-bold text-green-600">
                    {testCases.filter(tc => tc.status === 'completed').length}
                  </div>
                  <div className="text-green-600 mt-2">通过</div>
                </div>

                {/* 不通过/异常数 */}
                <div className="bg-red-100 rounded-lg p-6 text-center">
                  <div className="text-6xl font-bold text-red-600">
                    {testCases.filter(tc => tc.status === 'failed' || tc.status === 'error').length}
                  </div>
                  <div className="text-red-600 mt-2">不通过/异常</div>
                </div>
              </div>

              {/* 执行结果图表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧通过率图表 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-center font-medium mb-4">通过率: {testCases.length > 0 ? Math.round((testCases.filter(tc => tc.status === 'completed').length / testCases.length) * 100) : 0}%</h3>
                  <div className="flex justify-center">
                    <div className="relative w-48 h-48">
                      {/* 实际图表可以用SVG或Canvas实现，这里使用简化的圆环表示 */}
                      <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                      <div 
                        className="absolute inset-0 rounded-full border-8 border-green-500" 
                        style={{ 
                          clipPath: testCases.length > 0 
                            ? `polygon(50% 50%, 50% 0, ${50 + 50 * Math.sin(2 * Math.PI * (testCases.filter(tc => tc.status === 'completed').length / testCases.length))}% ${50 - 50 * Math.cos(2 * Math.PI * (testCases.filter(tc => tc.status === 'completed').length / testCases.length))}%, 50% 50%)` 
                            : 'none',
                          transform: 'rotate(-90deg)' 
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{testCases.length > 0 ? Math.round((testCases.filter(tc => tc.status === 'completed').length / testCases.length) * 100) : 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右侧测试用例状态分布 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-center font-medium mb-4">测试用例状态分布</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span>通过</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">{testCases.filter(tc => tc.status === 'completed').length}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-green-500 h-2.5 rounded-full" 
                            style={{ width: `${testCases.length > 0 ? (testCases.filter(tc => tc.status === 'completed').length / testCases.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span>失败</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">{testCases.filter(tc => tc.status === 'failed').length}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-red-500 h-2.5 rounded-full" 
                            style={{ width: `${testCases.length > 0 ? (testCases.filter(tc => tc.status === 'failed').length / testCases.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                        <span>异常</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">{testCases.filter(tc => tc.status === 'error').length}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-yellow-500 h-2.5 rounded-full" 
                            style={{ width: `${testCases.length > 0 ? (testCases.filter(tc => tc.status === 'error').length / testCases.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 测试用例详情表 */}
              <div className="mt-6">
                <h3 className="font-medium mb-4">测试用例详情</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">测试用例</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {testCases.map((testCase) => (
                        <tr key={testCase.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{testCase.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: testCase.color }}></div>
                              <div className="ml-2">
                                <div className="text-sm font-medium text-gray-900">{testCase.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(testCase.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:text-indigo-900"
                              onClick={() => toggleTestCase(testCase.id)}
                            >
                              查看详情
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* 图片查看器对话框 */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-gray-800 max-h-[90vh] overflow-hidden">
          <div className="relative flex flex-col h-full">
            <DialogClose className="absolute right-2 top-2 z-10">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
                <span>
                  <X className="h-5 w-5" />
                </span>
              </Button>
            </DialogClose>

            <div className="flex justify-between items-center p-4 border-b border-gray-800 w-full">
              <div className="text-white">
                <h3 className="font-medium">{selectedImage?.id}</h3>
                <p className="text-sm text-gray-400">{selectedImage?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center text-white bg-gray-800 hover:bg-gray-700 border-gray-700"
                  onClick={() => setZoomLevel(Math.max(zoomLevel - 0.1, 0.1))}
                >
                  <Minus className="h-4 w-4" /> <span className="ml-1">缩小</span>
                </Button>
                <div className="px-2 py-1 rounded-md bg-gray-800 text-white min-w-14 text-center">
                  {(zoomLevel * 100).toFixed(0)}%
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center text-white bg-gray-800 hover:bg-gray-700 border-gray-700"
                  onClick={() => setZoomLevel(zoomLevel + 0.1)}
                >
                  <Plus className="h-4 w-4" /> <span className="ml-1">放大</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 flex items-center text-white bg-gray-800 hover:bg-gray-700 border-gray-700"
                  onClick={() => setRotation((rotation + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" /> <span className="ml-1">旋转</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 flex items-center text-white bg-gray-800 hover:bg-gray-700 border-gray-700"
                  onClick={() => {
                    setZoomLevel(1)
                    setRotation(0)
                  }}
                >
                  <RefreshCw className="h-4 w-4" /> <span className="ml-1">重置</span>
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full relative flex items-center justify-center bg-black overflow-hidden">
              {selectedImage && (
                <div
                  className="relative flex items-center justify-center w-full h-full max-h-[calc(90vh-140px)]"
                  style={{
                    overflow: "hidden",
                    padding: "20px"
                  }}
                >
                  <img
                    src={selectedImage?.url || "/placeholder.svg"}
                    alt={selectedImage?.title || "图片"}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease",
                    }}
                    onError={(e) => {
                      console.error('图片加载失败:', selectedImage?.url);
                      console.error('图片URL详情:', {
                        url: selectedImage?.url,
                        isApiPath: selectedImage?.url?.startsWith('/api/') ? true : false,
                        id: selectedImage?.id,
                        type: selectedImage?.type
                      });
                      // 尝试使用不同的URL格式重新加载
                      if (selectedImage?.url && !selectedImage.url.includes(API_BASE_URL)) {
                        const newUrl = selectedImage.url.startsWith('/') ? 
                          `${API_BASE_URL}${selectedImage.url}` : 
                          `${API_BASE_URL}/${selectedImage.url}`;
                        console.log('尝试使用新URL重新加载:', newUrl);
                        (e.target as HTMLImageElement).src = newUrl;
                        return;
                      }
                      // 如果仍然失败，设置一个错误占位图
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                      toast({
                        title: "图片加载失败",
                        description: `无法加载图片: ${selectedImage?.id}`,
                        variant: "destructive",
                      });
                    }}
                    onLoad={() => {
                      console.log('图片成功加载:', {
                        url: selectedImage?.url,
                        id: selectedImage?.id,
                        type: selectedImage?.type
                      });
                    }}
                  />
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-white/20 border-gray-700"
                onClick={prevImage}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                上一张
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-white/20 border-gray-700"
                onClick={nextImage}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                下一张
              </Button>
            </div>

            <div className="p-4 bg-gray-900 text-white text-sm flex justify-between items-center">
              <div>
                {selectedImage && (
                  <span>
                    {selectedImage.id}
                    {selectedImage.description && <span className="ml-2">- {selectedImage.description}</span>}
                  </span>
                )}
              </div>
              <div>
                {selectedImage && (
                  <span>
                    {(() => {
                      const allImages = [...Object.values(testCaseImages).flat(), ...Object.values(testCaseScreenshots).flat()];
                      const currentIndex = allImages.findIndex((img) => img.id === selectedImage.id);
                      return `${currentIndex + 1} / ${allImages.length}`;
                    })()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

