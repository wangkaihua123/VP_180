"use client"

import { useState } from "react"
import { LayoutWithNav } from "@/components/layout-with-nav"
import { motion } from "framer-motion"
import { Plus, Trash2, ChevronUp, ChevronDown, Save, X, SplitSquareVertical, Copy, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"

// 定义步骤类型
interface BaseStep {
  id: number
  type: "single" | "parallel"
}

// 单个操作步骤
interface OperationStep extends BaseStep {
  type: "single"
  action: string
  target?: string
  value?: string
  description?: string
  wait?: number
}

// 并行操作步骤组
interface ParallelOperationSteps extends BaseStep {
  type: "parallel"
  steps: OperationStep[]
  description?: string
}

// 操作步骤类型（可以是单个步骤或并行步骤组）
type OperationStepType = OperationStep | ParallelOperationSteps

// 单个验证步骤
interface VerificationStep extends BaseStep {
  type: "single"
  verification: string
  target?: string
  expected?: string
  description?: string
}

// 并行验证步骤组
interface ParallelVerificationSteps extends BaseStep {
  type: "parallel"
  steps: VerificationStep[]
  description?: string
}

// 验证步骤类型（可以是单个步骤或并行步骤组）
type VerificationStepType = VerificationStep | ParallelVerificationSteps

export default function NewTestCasePage() {
  // 操作步骤和验证步骤状态
  const [operationSteps, setOperationSteps] = useState<OperationStepType[]>([{ id: 1, type: "single", action: "" }])
  const [verificationSteps, setVerificationSteps] = useState<VerificationStepType[]>([
    { id: 1, type: "single", verification: "" },
  ])

  // 并行步骤对话框状态
  const [showParallelDialog, setShowParallelDialog] = useState(false)
  const [parallelDialogType, setParallelDialogType] = useState<"operation" | "verification">("operation")
  const [parallelStepCount, setParallelStepCount] = useState(2)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<"operation" | "verification">("operation")
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false)
  const [deviceEvents, setDeviceEvents] = useState<any[]>([])

  // 添加单个操作步骤
  const addOperationStep = () => {
    const newId = Math.max(...operationSteps.map((step) => step.id), 0) + 1
    setOperationSteps([...operationSteps, { id: newId, type: "single", action: "" }])
  }

  // 添加单个验证步骤
  const addVerificationStep = () => {
    const newId = Math.max(...verificationSteps.map((step) => step.id), 0) + 1
    setVerificationSteps([...verificationSteps, { id: newId, type: "single", verification: "" }])
  }

  // 移除操作步骤
  const removeOperationStep = (id: number) => {
    setOperationSteps(operationSteps.filter((step) => step.id !== id))
  }

  // 移除验证步骤
  const removeVerificationStep = (id: number) => {
    setVerificationSteps(verificationSteps.filter((step) => step.id !== id))
  }

  // 移除并行��作步骤组中的单个步骤
  const removeParallelOperationStep = (groupId: number, stepId: number) => {
    setOperationSteps(
      operationSteps.map((step) => {
        if (step.type === "parallel" && step.id === groupId) {
          // 如果并行组中只剩一个步骤，则将整个并行组转换为单个步骤
          if (step.steps.length <= 2) {
            const remainingStep = step.steps.find((s) => s.id !== stepId)
            if (remainingStep) {
              return { ...remainingStep, id: step.id }
            }
            return { id: step.id, type: "single", action: "" }
          }

          // 否则只移除指定的步骤
          return {
            ...step,
            steps: step.steps.filter((s) => s.id !== stepId),
          }
        }
        return step
      }),
    )
  }

  // 移除并行验证步骤组中的单个步骤
  const removeParallelVerificationStep = (groupId: number, stepId: number) => {
    setVerificationSteps(
      verificationSteps.map((step) => {
        if (step.type === "parallel" && step.id === groupId) {
          // 如果并行组中只剩一个步骤，则将整个并行组转换为单个步骤
          if (step.steps.length <= 2) {
            const remainingStep = step.steps.find((s) => s.id !== stepId)
            if (remainingStep) {
              return { ...remainingStep, id: step.id }
            }
            return { id: step.id, type: "single", verification: "" }
          }

          // 否则只移除指定的步骤
          return {
            ...step,
            steps: step.steps.filter((s) => s.id !== stepId),
          }
        }
        return step
      }),
    )
  }

  // 在并行操作步骤组中添加新步骤
  const addStepToParallelOperation = (groupId: number) => {
    setOperationSteps(
      operationSteps.map((step) => {
        if (step.type === "parallel" && step.id === groupId) {
          const newId = Math.max(...step.steps.map((s) => s.id), 0) + 1
          return {
            ...step,
            steps: [...step.steps, { id: newId, type: "single", action: "" }],
          }
        }
        return step
      }),
    )
  }

  // 在并行验证步骤组中添加新步骤
  const addStepToParallelVerification = (groupId: number) => {
    setVerificationSteps(
      verificationSteps.map((step) => {
        if (step.type === "parallel" && step.id === groupId) {
          const newId = Math.max(...step.steps.map((s) => s.id), 0) + 1
          return {
            ...step,
            steps: [...step.steps, { id: newId, type: "single", verification: "" }],
          }
        }
        return step
      }),
    )
  }

  // 更新操作步骤
  const updateOperationStep = (id: number, field: keyof OperationStep, value: any) => {
    setOperationSteps(
      operationSteps.map((step) => {
        if (step.type === "single" && step.id === id) {
          return { ...step, [field]: value }
        }
        return step
      }),
    )
  }

  // 更新并行操作步骤组中的单个步骤
  const updateParallelOperationStep = (groupId: number, stepId: number, field: keyof OperationStep, value: any) => {
    setOperationSteps(
      operationSteps.map((step) => {
        if (step.type === "parallel" && step.id === groupId) {
          return {
            ...step,
            steps: step.steps.map((s) => {
              if (s.id === stepId) {
                return { ...s, [field]: value }
              }
              return s
            }),
          }
        }
        return step
      }),
    )
  }

  // 更新验证步骤
  const updateVerificationStep = (id: number, field: keyof VerificationStep, value: any) => {
    setVerificationSteps(
      verificationSteps.map((step) => {
        if (step.type === "single" && step.id === id) {
          return { ...step, [field]: value }
        }
        return step
      }),
    )
  }

  // 更新并行验证步骤组中的单个步骤
  const updateParallelVerificationStep = (
    groupId: number,
    stepId: number,
    field: keyof VerificationStep,
    value: any,
  ) => {
    setVerificationSteps(
      verificationSteps.map((step) => {
        if (step.type === "parallel" && step.id === groupId) {
          return {
            ...step,
            steps: step.steps.map((s) => {
              if (s.id === stepId) {
                return { ...s, [field]: value }
              }
              return s
            }),
          }
        }
        return step
      }),
    )
  }

  // 移动操作步骤
  const moveOperationStep = (id: number, direction: "up" | "down") => {
    const index = operationSteps.findIndex((step) => step.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === operationSteps.length - 1)) {
      return
    }

    const newSteps = [...operationSteps]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const temp = newSteps[index]
    newSteps[index] = newSteps[targetIndex]
    newSteps[targetIndex] = temp
    setOperationSteps(newSteps)
  }

  // 移动验证步骤
  const moveVerificationStep = (id: number, direction: "up" | "down") => {
    const index = verificationSteps.findIndex((step) => step.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === verificationSteps.length - 1)) {
      return
    }

    const newSteps = [...verificationSteps]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const temp = newSteps[index]
    newSteps[index] = newSteps[targetIndex]
    newSteps[targetIndex] = temp
    setVerificationSteps(newSteps)
  }

  // 复制操作步骤
  const duplicateOperationStep = (id: number) => {
    const stepToDuplicate = operationSteps.find((step) => step.id === id)
    if (!stepToDuplicate) return

    const newId = Math.max(...operationSteps.map((step) => step.id), 0) + 1
    const index = operationSteps.findIndex((step) => step.id === id)

    if (stepToDuplicate.type === "single") {
      const newStep: OperationStep = {
        ...JSON.parse(JSON.stringify(stepToDuplicate)),
        id: newId,
      }
      const newSteps = [...operationSteps]
      newSteps.splice(index + 1, 0, newStep)
      setOperationSteps(newSteps)
    } else {
      // 复制并行步骤组
      const newSteps = stepToDuplicate.steps.map((s, i) => ({
        ...JSON.parse(JSON.stringify(s)),
        id: newId + i + 1,
      }))

      const newParallelGroup: ParallelOperationSteps = {
        id: newId,
        type: "parallel",
        steps: newSteps,
        description: stepToDuplicate.description,
      }

      const newOperationSteps = [...operationSteps]
      newOperationSteps.splice(index + 1, 0, newParallelGroup)
      setOperationSteps(newOperationSteps)
    }
  }

  // 复制验证步骤
  const duplicateVerificationStep = (id: number) => {
    const stepToDuplicate = verificationSteps.find((step) => step.id === id)
    if (!stepToDuplicate) return

    const newId = Math.max(...verificationSteps.map((step) => step.id), 0) + 1
    const index = verificationSteps.findIndex((step) => step.id === id)

    if (stepToDuplicate.type === "single") {
      const newStep: VerificationStep = {
        ...JSON.parse(JSON.stringify(stepToDuplicate)),
        id: newId,
      }
      const newSteps = [...verificationSteps]
      newSteps.splice(index + 1, 0, newStep)
      setVerificationSteps(newSteps)
    } else {
      // 复制并行步骤组
      const newSteps = stepToDuplicate.steps.map((s, i) => ({
        ...JSON.parse(JSON.stringify(s)),
        id: newId + i + 1,
      }))

      const newParallelGroup: ParallelVerificationSteps = {
        id: newId,
        type: "parallel",
        steps: newSteps,
        description: stepToDuplicate.description,
      }

      const newVerificationSteps = [...verificationSteps]
      newVerificationSteps.splice(index + 1, 0, newParallelGroup)
      setVerificationSteps(newVerificationSteps)
    }
  }

  // 开始可视化操作录制
  const startVisualRecording = () => {
    setRecordingType("operation")
    setDeviceEvents([])
    setIsRecording(true)
    setRecordingDialogOpen(true)

    // 模拟设备事件接收
    const eventTypes = ["click", "input", "swipe", "longPress"]
    const mockEventInterval = setInterval(() => {
      if (!isRecording) {
        clearInterval(mockEventInterval)
        return
      }

      const randomEvent = {
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        timestamp: new Date().toISOString(),
        coordinates: {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000),
        },
        target: Math.random() > 0.5 ? "#login-button" : ".input-field",
        value: Math.random() > 0.7 ? "测试文本" : "",
      }

      setDeviceEvents((prev) => [...prev, randomEvent])

      // 自动生成操作步骤
      const newId = Math.max(...operationSteps.map((step) => step.id), 0) + 1
      const newStep: OperationStep = {
        id: newId,
        type: "single",
        action: "",
        description: "",
      }

      switch (randomEvent.type) {
        case "click":
          newStep.action = "click"
          newStep.target = randomEvent.target
          newStep.description = `点击坐标 (${randomEvent.coordinates.x}, ${randomEvent.coordinates.y})`
          break
        case "input":
          newStep.action = "input"
          newStep.target = randomEvent.target
          newStep.value = randomEvent.value
          newStep.description = `输入文本 "${randomEvent.value}"`
          break
        case "swipe":
          newStep.action = "scroll"
          newStep.description = `滑动屏幕 (${randomEvent.coordinates.x}, ${randomEvent.coordinates.y})`
          break
        case "longPress":
          newStep.action = "hover"
          newStep.target = randomEvent.target
          newStep.description = `长按元素 (${randomEvent.coordinates.x}, ${randomEvent.coordinates.y})`
          break
      }

      setOperationSteps((prev) => [...prev, newStep])
    }, 3000) // 每3秒生成一个事件

    // 清理函数
    return () => clearInterval(mockEventInterval)
  }

  // 开始可视化验证录制
  const startVisualVerification = () => {
    setRecordingType("verification")
    setDeviceEvents([])
    setIsRecording(true)
    setRecordingDialogOpen(true)

    // 模拟设备验证事件接收
    const verificationTypes = ["element-exists", "text-contains", "element-visible", "url-contains"]
    const mockEventInterval = setInterval(() => {
      if (!isRecording) {
        clearInterval(mockEventInterval)
        return
      }

      const randomEvent = {
        type: verificationTypes[Math.floor(Math.random() * verificationTypes.length)],
        timestamp: new Date().toISOString(),
        target: Math.random() > 0.5 ? "#success-message" : ".status-indicator",
        expected: Math.random() > 0.5 ? "成功" : "已完成",
      }

      setDeviceEvents((prev) => [...prev, randomEvent])

      // 自动生成验证步骤
      const newId = Math.max(...verificationSteps.map((step) => step.id), 0) + 1
      const newStep: VerificationStep = {
        id: newId,
        type: "single",
        verification: randomEvent.type,
        target: randomEvent.target,
        expected: randomEvent.expected,
        description: `验证 ${randomEvent.target} ${
          randomEvent.type === "element-exists"
            ? "存在"
            : randomEvent.type === "text-contains"
              ? "包含文本"
              : randomEvent.type === "element-visible"
                ? "可见"
                : "URL包含"
        } "${randomEvent.expected}"`,
      }

      setVerificationSteps((prev) => [...prev, newStep])
    }, 3000) // 每3秒生成一个验证事件

    // 清理函数
    return () => clearInterval(mockEventInterval)
  }

  // 停止录制
  const stopRecording = () => {
    setIsRecording(false)
    setRecordingDialogOpen(false)
  }

  return (
    <LayoutWithNav>
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  标题 <span className="text-red-500">*</span>
                </Label>
                <Input id="title" placeholder="输入测试用例标题" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium">
                  测试用例类型 <span className="text-red-500">*</span>
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择测试用例类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">功能测试</SelectItem>
                    <SelectItem value="integration">集成测试</SelectItem>
                    <SelectItem value="performance">性能测试</SelectItem>
                    <SelectItem value="security">安全测试</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                描述
              </Label>
              <Textarea id="description" placeholder="输入测试用例描述" className="min-h-[100px]" />
            </div>

            <Tabs defaultValue="operation" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="operation">操作步骤</TabsTrigger>
                <TabsTrigger value="verification">验证步骤</TabsTrigger>
              </TabsList>

              <TabsContent value="operation" className="space-y-4 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">操作步骤</h3>
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => startVisualRecording()}>
                            <Camera className="h-4 w-4 mr-1" />
                            添加可视化用例
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>监听设备操作并自动生成步骤</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="sm" onClick={addOperationStep}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加步骤
                    </Button>
                  </div>
                </div>

                {operationSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {step.type === "single" ? (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">步骤 {index + 1}</h3>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveOperationStep(step.id, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                                <span className="sr-only">上移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveOperationStep(step.id, "down")}
                                disabled={index === operationSteps.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">下移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => duplicateOperationStep(step.id)}
                              >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">复制</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeOperationStep(step.id)}
                                disabled={operationSteps.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">删除</span>
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`operation-${step.id}`} className="text-sm font-medium">
                                操作
                              </Label>
                              <Select
                                value={step.action}
                                onValueChange={(value) => updateOperationStep(step.id, "action", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="选择操作" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      基本操作
                                    </SelectLabel>
                                    <SelectItem value="click">点击元素</SelectItem>
                                    <SelectItem value="input">输入文本</SelectItem>
                                    <SelectItem value="select">选择选项</SelectItem>
                                    <SelectItem value="clear">清除输入</SelectItem>
                                    <SelectItem value="submit">提交表单</SelectItem>
                                  </SelectGroup>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      导航操作
                                    </SelectLabel>
                                    <SelectItem value="navigate">导航到URL</SelectItem>
                                    <SelectItem value="back">返回上一页</SelectItem>
                                    <SelectItem value="forward">前进到下一页</SelectItem>
                                    <SelectItem value="refresh">刷新页面</SelectItem>
                                  </SelectGroup>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      等待操作
                                    </SelectLabel>
                                    <SelectItem value="wait">等待时间</SelectItem>
                                    <SelectItem value="waitForElement">等待元素出现</SelectItem>
                                    <SelectItem value="waitForVisible">等待元素可见</SelectItem>
                                    <SelectItem value="waitForNavigation">等待页面导航</SelectItem>
                                  </SelectGroup>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      高级操作
                                    </SelectLabel>
                                    <SelectItem value="hover">悬停元素</SelectItem>
                                    <SelectItem value="scroll">滚动页面</SelectItem>
                                    <SelectItem value="screenshot">截取屏幕</SelectItem>
                                    <SelectItem value="upload">上传文件</SelectItem>
                                    <SelectItem value="executeScript">执行脚本</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`target-${step.id}`} className="text-sm font-medium">
                                目标
                              </Label>
                              <Input
                                id={`target-${step.id}`}
                                placeholder="输入目标元素"
                                value={step.target || ""}
                                onChange={(e) => updateOperationStep(step.id, "target", e.target.value)}
                              />
                            </div>
                          </div>

                          {(step.action === "input" || step.action === "select") && (
                            <div className="mt-4 space-y-2">
                              <Label htmlFor={`value-${step.id}`} className="text-sm font-medium">
                                值
                              </Label>
                              <Input
                                id={`value-${step.id}`}
                                placeholder="输入值"
                                value={step.value || ""}
                                onChange={(e) => updateOperationStep(step.id, "value", e.target.value)}
                              />
                            </div>
                          )}

                          {step.action === "wait" && (
                            <div className="mt-4 space-y-2">
                              <Label htmlFor={`wait-${step.id}`} className="text-sm font-medium">
                                等待时间 (毫秒)
                              </Label>
                              <Input
                                id={`wait-${step.id}`}
                                type="number"
                                placeholder="输入等待时间"
                                value={step.wait || ""}
                                onChange={(e) => updateOperationStep(step.id, "wait", Number.parseInt(e.target.value))}
                              />
                            </div>
                          )}

                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`description-${step.id}`} className="text-sm font-medium">
                              描述
                            </Label>
                            <Input
                              id={`description-${step.id}`}
                              placeholder="输入步骤描述"
                              value={step.description || ""}
                              onChange={(e) => updateOperationStep(step.id, "description", e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-blue-200">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CardTitle className="text-base font-medium flex items-center">
                                <SplitSquareVertical className="h-4 w-4 mr-2 text-blue-500" />
                                并行步骤组 {index + 1}
                                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600">
                                  同时执行 {step.steps.length} 个步骤
                                </Badge>
                              </CardTitle>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveOperationStep(step.id, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                                <span className="sr-only">上移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveOperationStep(step.id, "down")}
                                disabled={index === operationSteps.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">下移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => duplicateOperationStep(step.id)}
                              >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">复制</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeOperationStep(step.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">删除</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          <div className="space-y-4">
                            <Input
                              placeholder="并行步骤组描述"
                              value={step.description || ""}
                              onChange={(e) => {
                                setOperationSteps(
                                  operationSteps.map((s) => {
                                    if (s.id === step.id && s.type === "parallel") {
                                      return { ...s, description: e.target.value }
                                    }
                                    return s
                                  }),
                                )
                              }}
                              className="mb-2"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {step.steps.map((parallelStep, parallelIndex) => (
                                <Card key={parallelStep.id} className="border-blue-100">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-sm font-medium">并行步骤 {parallelIndex + 1}</h4>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => removeParallelOperationStep(step.id, parallelStep.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        <span className="sr-only">删除</span>
                                      </Button>
                                    </div>

                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`parallel-operation-${parallelStep.id}`}
                                        className="text-xs font-medium"
                                      >
                                        操作
                                      </Label>
                                      <Select
                                        value={parallelStep.action}
                                        onValueChange={(value) =>
                                          updateParallelOperationStep(step.id, parallelStep.id, "action", value)
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="选择操作" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              基本操作
                                            </SelectLabel>
                                            <SelectItem value="click">点击元素</SelectItem>
                                            <SelectItem value="input">输入文本</SelectItem>
                                            <SelectItem value="select">选择选项</SelectItem>
                                            <SelectItem value="clear">清除输入</SelectItem>
                                          </SelectGroup>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              导航操作
                                            </SelectLabel>
                                            <SelectItem value="navigate">导航到URL</SelectItem>
                                            <SelectItem value="refresh">刷新页面</SelectItem>
                                          </SelectGroup>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              等待操作
                                            </SelectLabel>
                                            <SelectItem value="wait">等待时间</SelectItem>
                                            <SelectItem value="waitForElement">等待元素出现</SelectItem>
                                          </SelectGroup>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              高级操作
                                            </SelectLabel>
                                            <SelectItem value="screenshot">截取屏幕</SelectItem>
                                            <SelectItem value="upload">上传文件</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2 mt-2">
                                      <Label
                                        htmlFor={`parallel-target-${parallelStep.id}`}
                                        className="text-xs font-medium"
                                      >
                                        目标
                                      </Label>
                                      <Input
                                        id={`parallel-target-${parallelStep.id}`}
                                        placeholder="输入目标元素"
                                        value={parallelStep.target || ""}
                                        onChange={(e) =>
                                          updateParallelOperationStep(
                                            step.id,
                                            parallelStep.id,
                                            "target",
                                            e.target.value,
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>

                                    {(parallelStep.action === "input" || parallelStep.action === "select") && (
                                      <div className="space-y-2 mt-2">
                                        <Label
                                          htmlFor={`parallel-value-${parallelStep.id}`}
                                          className="text-xs font-medium"
                                        >
                                          值
                                        </Label>
                                        <Input
                                          id={`parallel-value-${parallelStep.id}`}
                                          placeholder="输入值"
                                          value={parallelStep.value || ""}
                                          onChange={(e) =>
                                            updateParallelOperationStep(
                                              step.id,
                                              parallelStep.id,
                                              "value",
                                              e.target.value,
                                            )
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => addStepToParallelOperation(step.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              添加并行步骤
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                ))}

                <Button type="button" variant="outline" className="w-full" onClick={addOperationStep}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加操作步骤
                </Button>
              </TabsContent>

              <TabsContent value="verification" className="space-y-4 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">验证步骤</h3>
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => startVisualVerification()}>
                            <Camera className="h-4 w-4 mr-1" />
                            添加可视化验证
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>监听设备验证操作并自动生成步骤</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="sm" onClick={addVerificationStep}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加验证
                    </Button>
                  </div>
                </div>

                {verificationSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {step.type === "single" ? (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">验证 {index + 1}</h3>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveVerificationStep(step.id, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                                <span className="sr-only">上移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveVerificationStep(step.id, "down")}
                                disabled={index === verificationSteps.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">下移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => duplicateVerificationStep(step.id)}
                              >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">复制</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeVerificationStep(step.id)}
                                disabled={verificationSteps.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">删除</span>
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`verification-${step.id}`} className="text-sm font-medium">
                                验证类型
                              </Label>
                              <Select
                                value={step.verification}
                                onValueChange={(value) => updateVerificationStep(step.id, "verification", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="选择验证类型" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      元素验证
                                    </SelectLabel>
                                    <SelectItem value="element-exists">元素存在</SelectItem>
                                    <SelectItem value="element-visible">元素可见</SelectItem>
                                    <SelectItem value="element-enabled">元素可用</SelectItem>
                                    <SelectItem value="element-count">元素数量</SelectItem>
                                  </SelectGroup>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      内容验证
                                    </SelectLabel>
                                    <SelectItem value="text-contains">文本包含</SelectItem>
                                    <SelectItem value="text-equals">文本等于</SelectItem>
                                    <SelectItem value="element-value">元素值</SelectItem>
                                    <SelectItem value="element-attribute">元素属性</SelectItem>
                                  </SelectGroup>
                                  <SelectGroup>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      页面验证
                                    </SelectLabel>
                                    <SelectItem value="url-contains">URL包含</SelectItem>
                                    <SelectItem value="url-equals">URL等于</SelectItem>
                                    <SelectItem value="title-contains">标题包含</SelectItem>
                                    <SelectItem value="element-css">元素CSS属性</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`target-${step.id}`} className="text-sm font-medium">
                                目标
                              </Label>
                              <Input
                                id={`target-${step.id}`}
                                placeholder="输入目标元素"
                                value={step.target || ""}
                                onChange={(e) => updateVerificationStep(step.id, "target", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`expected-${step.id}`} className="text-sm font-medium">
                              预期结果
                            </Label>
                            <Input
                              id={`expected-${step.id}`}
                              placeholder="输入预期结果"
                              value={step.expected || ""}
                              onChange={(e) => updateVerificationStep(step.id, "expected", e.target.value)}
                            />
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`description-${step.id}`} className="text-sm font-medium">
                              描述
                            </Label>
                            <Input
                              id={`description-${step.id}`}
                              placeholder="输入步骤描述"
                              value={step.description || ""}
                              onChange={(e) => updateVerificationStep(step.id, "description", e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-purple-200">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CardTitle className="text-base font-medium flex items-center">
                                <SplitSquareVertical className="h-4 w-4 mr-2 text-purple-500" />
                                并行验证组 {index + 1}
                                <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-600">
                                  同时执行 {step.steps.length} 个验证
                                </Badge>
                              </CardTitle>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveVerificationStep(step.id, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                                <span className="sr-only">上移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveVerificationStep(step.id, "down")}
                                disabled={index === verificationSteps.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">下移</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => duplicateVerificationStep(step.id)}
                              >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">复制</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeVerificationStep(step.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">删除</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          <div className="space-y-4">
                            <Input
                              placeholder="并行验证组描述"
                              value={step.description || ""}
                              onChange={(e) => {
                                setVerificationSteps(
                                  verificationSteps.map((s) => {
                                    if (s.id === step.id && s.type === "parallel") {
                                      return { ...s, description: e.target.value }
                                    }
                                    return s
                                  }),
                                )
                              }}
                              className="mb-2"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {step.steps.map((parallelStep, parallelIndex) => (
                                <Card key={parallelStep.id} className="border-purple-100">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-sm font-medium">并行验证 {parallelIndex + 1}</h4>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => removeParallelVerificationStep(step.id, parallelStep.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        <span className="sr-only">删除</span>
                                      </Button>
                                    </div>

                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`parallel-verification-${parallelStep.id}`}
                                        className="text-xs font-medium"
                                      >
                                        验证类型
                                      </Label>
                                      <Select
                                        value={parallelStep.verification}
                                        onValueChange={(value) =>
                                          updateParallelVerificationStep(
                                            step.id,
                                            parallelStep.id,
                                            "verification",
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="选择验证类型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              元素验证
                                            </SelectLabel>
                                            <SelectItem value="element-exists">元素存在</SelectItem>
                                            <SelectItem value="element-visible">元素可见</SelectItem>
                                            <SelectItem value="element-enabled">元素可用</SelectItem>
                                          </SelectGroup>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              内容验证
                                            </SelectLabel>
                                            <SelectItem value="text-contains">文本包含</SelectItem>
                                            <SelectItem value="text-equals">文本等于</SelectItem>
                                            <SelectItem value="element-value">元素值</SelectItem>
                                          </SelectGroup>
                                          <SelectGroup>
                                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                              页面验证
                                            </SelectLabel>
                                            <SelectItem value="url-contains">URL包含</SelectItem>
                                            <SelectItem value="title-contains">标题包含</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2 mt-2">
                                      <Label
                                        htmlFor={`parallel-target-${parallelStep.id}`}
                                        className="text-xs font-medium"
                                      >
                                        目标
                                      </Label>
                                      <Input
                                        id={`parallel-target-${parallelStep.id}`}
                                        placeholder="输入目标元素"
                                        value={parallelStep.target || ""}
                                        onChange={(e) =>
                                          updateParallelVerificationStep(
                                            step.id,
                                            parallelStep.id,
                                            "target",
                                            e.target.value,
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>

                                    <div className="space-y-2 mt-2">
                                      <Label
                                        htmlFor={`parallel-expected-${parallelStep.id}`}
                                        className="text-xs font-medium"
                                      >
                                        预期结果
                                      </Label>
                                      <Input
                                        id={`parallel-expected-${parallelStep.id}`}
                                        placeholder="输入预期结果"
                                        value={parallelStep.expected || ""}
                                        onChange={(e) =>
                                          updateParallelVerificationStep(
                                            step.id,
                                            parallelStep.id,
                                            "expected",
                                            e.target.value,
                                          )
                                        }
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => addStepToParallelVerification(step.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              添加并行验证
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                ))}

                <Button type="button" variant="outline" className="w-full" onClick={addVerificationStep}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加验证步骤
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" asChild>
                <Link href="/">
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Link>
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                <Save className="mr-2 h-4 w-4" />
                保存测试用例
              </Button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* 可视化录制对话框 */}
      <Dialog open={recordingDialogOpen} onOpenChange={setRecordingDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {recordingType === "operation" ? "可视化操作录制" : "可视化验证录制"}
              {isRecording && (
                <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 animate-pulse">
                  录制中
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-4 bg-black/5 rounded-md">
              <h4 className="text-sm font-medium mb-2">设备事件流</h4>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {deviceEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">等待设备事件...</div>
                ) : (
                  <div className="space-y-2">
                    {deviceEvents.map((event, index) => (
                      <div key={index} className="text-xs border-l-2 border-black pl-2 py-1">
                        <span className="text-muted-foreground">[{event.timestamp.substring(11, 19)}]</span>{" "}
                        <span className="font-medium">{event.type}</span>
                        {event.coordinates && (
                          <span className="text-blue-600">
                            {" "}
                            @ ({event.coordinates.x}, {event.coordinates.y})
                          </span>
                        )}
                        {event.target && <span className="text-green-600"> 目标: {event.target}</span>}
                        {event.value && <span className="text-purple-600"> 值: "{event.value}"</span>}
                        {event.expected && <span className="text-orange-600"> 预期: "{event.expected}"</span>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {recordingType === "operation"
                ? "正在监听设备操作，每个操作将自动生成对应的测试步骤。"
                : "正在监听设备验证操作，每个验证将自动生成对应的验证步骤。"}
            </div>
            <div className="text-sm">
              已自动生成{" "}
              <span className="font-medium">
                {recordingType === "operation" ? operationSteps.length : verificationSteps.length}
              </span>{" "}
              个步骤
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={stopRecording}>
              停止录制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWithNav>
  )
}
