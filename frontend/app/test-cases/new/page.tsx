"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { testCaseAPI } from "@/lib/api"
import STEP_METHODS from "@/utils/test_method_mapping"
import { FUNCTIONS } from "@/utils/Config"

interface StepMethod {
  description: string;
  operation_key?: string;
  verification_key?: string;
  params: string[];
  default_values?: Record<string, any>;
  expected_result?: boolean;
}

type StepMethods = {
  "操作步骤": Record<string, StepMethod>;
  "验证步骤": Record<string, StepMethod>;
}

interface Function {
  screen: [number, number];
  touch: [number, number];
  chinese_name: string;
}

interface Functions {
  [key: string]: Function;
}

const getOperationSteps = () => {
  try {
    return Object.entries((STEP_METHODS as StepMethods)?.操作步骤 || {}).map(([key]) => ({
      value: key,
      label: key
    }));
  } catch (error) {
    console.error('Error loading operation steps:', error);
    return [];
  }
};

const getVerificationSteps = () => {
  try {
    return Object.entries((STEP_METHODS as StepMethods)?.验证步骤 || {}).map(([key, value]) => ({
      value: key,
      label: `${key} (${value.description})`,
      verification_key: value.verification_key
    }));
  } catch (error) {
    console.error('Error loading verification steps:', error);
    return [];
  }
};

interface VerificationStep {
  id: number;
  verification_key: string;
  img1?: string;
  img2?: string;
  value?: string;
  min_value?: string;
  max_value?: string;
  text?: string;
  expected_text?: string;
  element_name?: string;
  expected_state?: string;
}

interface OperationStep {
  id: number;
  operation_key: string;
  button_name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const getButtonOptions = () => {
  try {
    return Object.values(FUNCTIONS as Functions).map(func => ({
      value: func.chinese_name,
      label: func.chinese_name
    }));
  } catch (error) {
    console.error('Error loading button options:', error);
    return [];
  }
};

interface NewTestCasePageProps {
  initialData?: any;
  mode?: 'new' | 'edit';
}

export default function NewTestCasePage({ initialData, mode = 'new' }: NewTestCasePageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>(() => {
    if (initialData?.script_content) {
      const content = JSON.parse(initialData.script_content);
      return content.operationSteps || [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0 }];
    }
    return [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0 }];
  })
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>(() => {
    if (initialData?.script_content) {
      const content = JSON.parse(initialData.script_content);
      return content.verificationSteps || [{ id: 1, verification_key: "" }];
    }
    return [{ id: 1, verification_key: "" }];
  })
  const [testType, setTestType] = useState(initialData?.type || "功能测试")
  const [repeatCount, setRepeatCount] = useState(() => {
    if (initialData?.script_content) {
      const content = JSON.parse(initialData.script_content);
      return content.repeatCount || 1;
    }
    return 1;
  })

  // 在组件内部获取步骤选项
  const operationOptions = useMemo(() => getOperationSteps(), []);
  const verificationOptions = useMemo(() => getVerificationSteps(), []);
  const buttonOptions = useMemo(() => getButtonOptions(), []);

  const addOperationStep = () => {
    const newId = operationSteps.length > 0 ? Math.max(...operationSteps.map((step) => step.id)) + 1 : 1
    setOperationSteps([...operationSteps, { id: newId, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0 }])
  }

  const addVerificationStep = () => {
    const newId = verificationSteps.length > 0 ? Math.max(...verificationSteps.map((step) => step.id)) + 1 : 1
    setVerificationSteps([...verificationSteps, { id: newId, verification_key: "" }])
  }

  const removeOperationStep = (id: number) => {
    setOperationSteps(operationSteps.filter((step) => step.id !== id))
  }

  const removeVerificationStep = (id: number) => {
    setVerificationSteps(verificationSteps.filter((step) => step.id !== id))
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({
        title: "错误",
        description: "请输入测试用例标题",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const testCaseData = {
        title: title.trim(),
        type: testType,
        description: description.trim(),
        script_content: JSON.stringify({
          repeatCount,
          operationSteps,
          verificationSteps
        })
      }

      if (mode === 'edit' && initialData?.id) {
        await testCaseAPI.update(initialData.id, testCaseData)
        toast({
          title: "成功",
          description: "测试用例已更新"
        })
      } else {
        await testCaseAPI.create(testCaseData)
        toast({
          title: "成功",
          description: "测试用例已创建"
        })
      }
      router.push('/')  // 保存成功后跳转到主页
    } catch (error) {
      toast({
        title: mode === 'edit' ? "更新失败" : "创建失败",
        description: error instanceof Error ? error.message : mode === 'edit' ? "更新测试用例失败" : "创建测试用例失败",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 bg-black text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5 [&:hover]:text-white" />
              <span className="sr-only">返回</span>
            </Link>
          </Button>
          <h1 className="text-xl">
            <span className="font-bold text-white">优亿医疗</span>
            <span className="font-normal text-white text-sm ml-1">自动化测试平台</span>
            <span className="mx-2">-</span>
            <span>新建测试用例</span>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  标题 <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="title" 
                  placeholder="输入测试用例标题" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium">
                  测试用例类型 <span className="text-red-500">*</span>
                </Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择测试用例类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="功能测试">功能测试</SelectItem>
                    <SelectItem value="集成测试">集成测试</SelectItem>
                    <SelectItem value="性能测试">性能测试</SelectItem>
                    <SelectItem value="安全测试">安全测试</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeat-count" className="text-sm font-medium">
                  重复次数
                </Label>
                <Input
                  id="repeat-count"
                  type="number"
                  min="1"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                描述
              </Label>
              <Textarea 
                id="description" 
                placeholder="输入测试用例描述" 
                className="min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Tabs defaultValue="operation" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="operation">操作步骤</TabsTrigger>
                <TabsTrigger value="verification">验证步骤</TabsTrigger>
              </TabsList>

              <TabsContent value="operation" className="space-y-4 pt-4">
                {operationSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
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
                              value={step.operation_key}
                              onValueChange={(value) => {
                                const newSteps = [...operationSteps];
                                newSteps[index] = { ...step, operation_key: value };
                                setOperationSteps(newSteps);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择操作类型" />
                              </SelectTrigger>
                              <SelectContent>
                                {operationOptions.map((step) => (
                                  <SelectItem key={step.value} value={step.value}>
                                    {step.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`target-${step.id}`} className="text-sm font-medium">
                              目标
                            </Label>
                            {step.operation_key === "点击按钮" && (
                              <Select
                                value={step.button_name}
                                onValueChange={(value) => {
                                  const newSteps = [...operationSteps];
                                  newSteps[index] = { ...step, button_name: value };
                                  setOperationSteps(newSteps);
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择按钮" />
                                </SelectTrigger>
                                <SelectContent>
                                  {buttonOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {step.operation_key === "滑动操作" && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">起始点</Label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <Label className="text-xs text-gray-500 mb-1">X坐标</Label>
                                      <Input
                                        type="number"
                                        value={step.x1}
                                        onChange={(e) => {
                                          const newSteps = [...operationSteps];
                                          newSteps[index] = { ...step, x1: parseInt(e.target.value) };
                                          setOperationSteps(newSteps);
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <Label className="text-xs text-gray-500 mb-1">Y坐标</Label>
                                      <Input
                                        type="number"
                                        value={step.y1}
                                        onChange={(e) => {
                                          const newSteps = [...operationSteps];
                                          newSteps[index] = { ...step, y1: parseInt(e.target.value) };
                                          setOperationSteps(newSteps);
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">终点</Label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <Label className="text-xs text-gray-500 mb-1">X坐标</Label>
                                      <Input
                                        type="number"
                                        value={step.x2}
                                        onChange={(e) => {
                                          const newSteps = [...operationSteps];
                                          newSteps[index] = { ...step, x2: parseInt(e.target.value) };
                                          setOperationSteps(newSteps);
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <Label className="text-xs text-gray-500 mb-1">Y坐标</Label>
                                      <Input
                                        type="number"
                                        value={step.y2}
                                        onChange={(e) => {
                                          const newSteps = [...operationSteps];
                                          newSteps[index] = { ...step, y2: parseInt(e.target.value) };
                                          setOperationSteps(newSteps);
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                <Button type="button" variant="outline" className="w-full" onClick={addOperationStep}>
                  <Plus className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                  添加操作步骤
                </Button>
              </TabsContent>

              <TabsContent value="verification" className="space-y-4 pt-4">
                {verificationSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
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
                              value={step.verification_key}
                              onValueChange={(value) => {
                                const newSteps = [...verificationSteps];
                                newSteps[index] = { ...step, verification_key: value };
                                setVerificationSteps(newSteps);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择验证类型" />
                              </SelectTrigger>
                              <SelectContent>
                                {verificationOptions.map((step) => (
                                  <SelectItem key={step.value} value={step.value}>
                                    {step.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {verificationOptions.find(opt => opt.value === step.verification_key)?.verification_key === "图像验证" ? (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">预期结果</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">图像1</Label>
                                  <Select
                                    value={step.img1}
                                    onValueChange={(value) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, img1: value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择图像" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operationSteps
                                        .map((op, opIndex) => ({
                                          id: op.id,
                                          index: opIndex,
                                          type: op.operation_key
                                        }))
                                        .filter(op => op.type === "获取图像" || op.type === "获取截图")
                                        .map((op) => (
                                          <SelectItem key={op.id} value={op.id.toString()}>
                                            步骤 {op.index + 1}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">图像2</Label>
                                  <Select
                                    value={step.img2}
                                    onValueChange={(value) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, img2: value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择图像" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operationSteps
                                        .map((op, opIndex) => ({
                                          id: op.id,
                                          index: opIndex,
                                          type: op.operation_key
                                        }))
                                        .filter(op => op.type === "获取图像" || op.type === "获取截图")
                                        .map((op) => (
                                          <SelectItem key={op.id} value={op.id.toString()}>
                                            步骤 {op.index + 1}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : step.verification_key === "检查数值范围" ? (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">预期结果</Label>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">数值</Label>
                                  <Input
                                    type="number"
                                    value={step.value}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, value: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">最小值</Label>
                                  <Input
                                    type="number"
                                    value={step.min_value}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, min_value: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">最大值</Label>
                                  <Input
                                    type="number"
                                    value={step.max_value}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, max_value: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : step.verification_key === "检查文本内容" ? (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">预期结果</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">文本内容</Label>
                                  <Input
                                    value={step.text}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, text: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">预期文本</Label>
                                  <Input
                                    value={step.expected_text}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, expected_text: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : step.verification_key === "检查元素状态" ? (
                          <div className="space-y-2">
                              <Label className="text-sm font-medium">预期结果</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">元素名称</Label>
                                  <Input
                                    value={step.element_name}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, element_name: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">预期状态</Label>
                                  <Input
                                    value={step.expected_state}
                                    onChange={(e) => {
                                      const newSteps = [...verificationSteps];
                                      newSteps[index] = { ...step, expected_state: e.target.value };
                                      setVerificationSteps(newSteps);
                                    }}
                                  />
                                </div>
                              </div>
                          </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                <Button type="button" variant="outline" className="w-full" onClick={addVerificationStep}>
                  <Plus className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                  添加验证步骤
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" asChild>
                <Link href="/">
                  <X className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                  取消
                </Link>
              </Button>
              <Button 
                type="submit" 
                className="bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">保存中...</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                保存测试用例
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}

