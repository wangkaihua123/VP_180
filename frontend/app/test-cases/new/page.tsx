"use client"

import { useState, useMemo, useEffect } from "react"
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
import { testCasesAPI } from "@/lib/api/test-cases"
import STEP_METHODS from "@/utils/test_method_mapping"
import { FUNCTIONS } from "@/utils/Config"
import { projectSettingsAPI, Project } from "@/lib/api/project-settings"

interface StepMethod {
  description: string;
  short_description?: string;
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
    // 定义操作类别
    const categories = {
      "基本操作": ["点击按钮", "长按按钮", "滑动操作"],
      "随机操作": ["随机点击", "单点随机点击", "双点随机点击", "三点随机点击"],
      "图像操作": ["获取图像", "获取截图"],
      "设备控制": ["串口开机", "串口关机", "串口关-开机", "SSH重启设备", "串口重启设备"],
      "其他操作": ["等待时间"]
    };
    
    // 获取所有步骤
    const allSteps = Object.entries((STEP_METHODS as StepMethods)?.操作步骤 || {}).map(([key]) => ({
      value: key,
      label: key,
      category: Object.entries(categories).find(([_, steps]) => steps.includes(key))?.[0] || "其他操作"
    }));
    
    // 按类别组织步骤
    const stepsByCategory: Record<string, {value: string, label: string}[]> = {};
    
    // 初始化类别
    Object.keys(categories).forEach(category => {
      stepsByCategory[category] = [];
    });
    
    // 将步骤分组到对应类别
    allSteps.forEach(step => {
      if (stepsByCategory[step.category]) {
        stepsByCategory[step.category].push({
          value: step.value,
          label: step.label
        });
      }
    });
    
    return { stepsByCategory, allSteps };
  } catch (error) {
    console.error('Error loading operation steps:', error);
    return { stepsByCategory: {}, allSteps: [] };
  }
};

const getVerificationSteps = () => {
  try {
    // 定义验证类别
    const categories: Record<string, string[]> = {
      "图像验证": ["对比图像相似度", "对比图像关键点", "直方图比较", "颜色差异分析", "模板匹配", "边缘检测比较"],
      "亮度对比验证": ["亮度差异比较", "对比度比较"],
      "纹理验证": ["纹理特征比较"],
      "数值验证": ["检查数值范围"],
      "其他验证": []
    };
    
    // 获取所有验证步骤
    const allSteps = Object.entries((STEP_METHODS as StepMethods)?.验证步骤 || {}).map(([key, value]) => {
      // 查找步骤所属的类别
      let category = "其他验证";
      
      // 遍历类别，查找包含当前步骤的类别
      for (const [catName, steps] of Object.entries(categories)) {
        if (Array.isArray(steps) && steps.includes(key)) {
          category = catName;
          break;
        }
      }
      
      return {
        value: key,
        label: key,
        verification_key: value.verification_key,
        description: value.description,
        short_description: value.short_description || "",
        category
      };
    });
    
    // 按类别组织验证步骤
    const stepsByCategory: Record<string, {value: string, label: string, verification_key?: string, description: string, short_description: string}[]> = {};
    
    // 初始化类别
    Object.keys(categories).forEach(category => {
      stepsByCategory[category] = [];
    });
    
    // 将验证步骤分组到对应类别
    allSteps.forEach(step => {
      if (stepsByCategory[step.category]) {
        stepsByCategory[step.category].push({
          value: step.value,
          label: step.label,
          verification_key: step.verification_key,
          description: step.description,
          short_description: step.short_description
        });
      }
    });
    
    return { stepsByCategory, allSteps };
  } catch (error) {
    console.error('Error loading verification steps:', error);
    return { stepsByCategory: {}, allSteps: [] };
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
  waitTime?: number;
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

// 定义操作类型
const OPERATION_TYPES = {
  CLICK: "click",
  INPUT: "input",
  SELECT: "select",
  WAIT: "wait",
  NAVIGATE: "navigate",
  SCREENSHOT: "screenshot",
  SCROLL: "scroll",
  HOVER: "hover",
  UPLOAD: "upload",
  SERIAL_POWER_CYCLE: "serial_power_cycle", // 新增串口关-开机选项
  RANDOM_CLICK: "random_click", // 随机点击
  SINGLE_RANDOM_CLICK: "single_random_click", // 单点随机点击
  DOUBLE_RANDOM_CLICK: "double_random_click", // 双点随机点击
  TRIPLE_RANDOM_CLICK: "triple_random_click", // 三点随机点击
} as const

export default function NewTestCasePage({ initialData, mode = 'new' }: NewTestCasePageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [projects, setProjects] = useState<Project[]>([])
  const [projectName, setProjectName] = useState("")
  const [projectId, setProjectId] = useState("")
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>(() => {
    if (initialData?.script_content) {
      try {
        const content = JSON.parse(initialData.script_content);
        return content.operationSteps || [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0 }];
      } catch (e) {
        console.error('Error parsing script_content:', e);
        return [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0 }];
      }
    }
    return [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0 }];
  })
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>(() => {
    if (initialData?.script_content) {
      try {
        const content = JSON.parse(initialData.script_content);
        return content.verificationSteps || [{ id: 1, verification_key: "" }];
      } catch (e) {
        console.error('Error parsing script_content:', e);
        return [{ id: 1, verification_key: "" }];
      }
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
  const { stepsByCategory: operationStepsByCategory, allSteps: allOperationSteps } = useMemo(() => getOperationSteps(), []);
  const { stepsByCategory: verificationStepsByCategory, allSteps: allVerificationSteps } = useMemo(() => getVerificationSteps(), []);
  const buttonOptions = useMemo(() => getButtonOptions(), []);

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await projectSettingsAPI.getProjects()
        setProjects(projectList)
        
        // 设置默认项目为最早创建的项目
        if (projectList.length > 0) {
          // 按创建时间排序（升序）
          const sortedProjects = [...projectList].sort((a, b) => 
            new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
          )
          
          // 如果是编辑模式且已有项目名称
          if (mode === 'edit' && initialData?.project_name) {
            setProjectName(initialData.project_name)
            // 找到对应的项目ID
            const foundProject = projectList.find(p => p.name === initialData.project_name)
            if (foundProject) {
              setProjectId(foundProject.id)
            }
          } else {
            // 使用最早创建的项目
            const firstProject = sortedProjects[0]
            setProjectName(firstProject.name)
            setProjectId(firstProject.id)
          }
        }
      } catch (error) {
        console.error('加载项目列表失败:', error)
        toast({
          title: "加载项目列表失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive"
        })
      }
    }
    
    loadProjects()
  }, [])

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

  const updateOperationStep = (id: number, field: keyof OperationStep, value: any) => {
    setOperationSteps((steps) =>
      steps.map((step) => {
        if (step.id === id) {
          const updatedStep = { ...step, [field]: value }
          if (field === 'button_name' && value) {
            const buttonConfig = (FUNCTIONS as Functions)[value]
            if (buttonConfig) {
              updatedStep.x1 = buttonConfig.touch[0]
              updatedStep.y1 = buttonConfig.touch[1]
              updatedStep.x2 = buttonConfig.screen[0]
              updatedStep.y2 = buttonConfig.screen[1]
            }
          }
          return updatedStep
        }
        return step
      })
    )
  }

  const updateVerificationStep = (id: number, field: keyof VerificationStep, value: any) => {
    setVerificationSteps((steps) =>
      steps.map((step) => (step.id === id ? { ...step, [field]: value } : step))
    )
  }

  const handleProjectChange = (name: string) => {
    setProjectName(name)
    const project = projects.find(p => p.name === name)
    if (project) {
      setProjectId(project.id)
    }
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

    if (!projectName || !projectId) {
      toast({
        title: "错误",
        description: "请选择项目",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const serializedContent = JSON.stringify({
        repeatCount: parseInt(repeatCount.toString()) || 1,
        operationSteps,
        verificationSteps
      })
      
      // 检查操作步骤中是否包含串口操作
      const hasSerialOperation = operationSteps.some(
        step => step.operation_key === "串口开机" || 
               step.operation_key === "串口关机" || 
               step.operation_key === "串口关-开机"
      );
      
      const testCaseData: any = {
        title: title.trim(),
        type: testType,
        description: description.trim(),
        script_content: serializedContent,
        status: "未执行",
        create_time: new Date().toISOString().split('T')[0],
        serial_connect: hasSerialOperation,
        project_name: projectName,
        project_id: projectId
      }

      if (mode === 'edit' && initialData?.id) {
        await testCasesAPI.update(initialData.id, testCaseData)
        toast({
          title: "成功",
          description: "测试用例已更新"
        })
      } else {
        await testCasesAPI.create(testCaseData)
        toast({
          title: "成功",
          description: "测试用例已创建"
        })
      }
      router.push('/test-cases')
    } catch (error) {
      console.error("保存测试用例失败:", error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存测试用例失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">新增测试用例</h2>
        </div>
        
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
                <Label htmlFor="project" className="text-sm font-medium">
                  所属项目 <span className="text-red-500">*</span>
                </Label>
                <Select value={projectName} onValueChange={handleProjectChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.name}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <Tabs defaultValue="steps" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="steps">操作步骤</TabsTrigger>
                <TabsTrigger value="verification">验证步骤</TabsTrigger>
              </TabsList>

              <TabsContent value="steps" className="space-y-4 pt-4">
                {operationSteps.map((step, index) => (
                  <Card key={step.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">步骤 {index + 1}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => moveOperationStep(step.id, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => moveOperationStep(step.id, "down")}
                            disabled={index === operationSteps.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="text-destructive"
                            onClick={() => removeOperationStep(step.id)}
                            disabled={operationSteps.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>操作类型</Label>
                          <Select
                            value={step.operation_key}
                            onValueChange={(value) => updateOperationStep(step.id, "operation_key", value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择操作类型" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(operationStepsByCategory).map(([category, options]) => (
                                <div key={category}>
                                  <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
                                    {category}
                                  </div>
                                  {options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {(step.operation_key === "点击按钮" || step.operation_key === "长按按钮") && (
                          <div className="space-y-2">
                            <Label>按钮</Label>
                            <Select
                              value={step.button_name}
                              onValueChange={(value) => updateOperationStep(step.id, "button_name", value)}
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
                          </div>
                        )}
                        {step.operation_key === "滑动操作" && (
                          <div className="space-y-2">
                            <Label>滑动坐标</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500 mb-1">起始点X (x1)</Label>
                                <Input
                                  type="number"
                                  value={step.x1}
                                  onChange={(e) => updateOperationStep(step.id, "x1", parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1">起始点Y (y1)</Label>
                                <Input
                                  type="number"
                                  value={step.y1}
                                  onChange={(e) => updateOperationStep(step.id, "y1", parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1">终点X (x2)</Label>
                                <Input
                                  type="number"
                                  value={step.x2}
                                  onChange={(e) => updateOperationStep(step.id, "x2", parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1">终点Y (y2)</Label>
                                <Input
                                  type="number"
                                  value={step.y2}
                                  onChange={(e) => updateOperationStep(step.id, "y2", parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {(step.operation_key === "串口开机" || step.operation_key === "串口关机" || step.operation_key === "串口关-开机") && (
                          <div className="space-y-2">
                            <Label>等待时间 (毫秒)</Label>
                            <Input
                              type="number"
                              value={step.waitTime || 1000}
                              onChange={(e) => updateOperationStep(step.id, "waitTime", parseInt(e.target.value) || 1000)}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
                              type="button"
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
                              type="button"
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
                              type="button"
                              onClick={() => removeVerificationStep(step.id)}
                              disabled={verificationSteps.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">删除</span>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label htmlFor={`verification-${step.id}`} className="text-sm font-medium">
                              验证类型
                            </Label>
                            <Select
                              value={step.verification_key}
                              onValueChange={(value) => updateVerificationStep(step.id, "verification_key", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择验证类型" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(verificationStepsByCategory).map(([category, options]) => (
                                  <div key={category}>
                                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
                                      {category}
                                    </div>
                                    {options.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label} - {option.short_description}
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                            {step.verification_key && (
                              <div className="mt-2 text-sm text-gray-500">
                                {allVerificationSteps.find(opt => opt.value === step.verification_key)?.description}
                              </div>
                            )}
                          </div>

                          {allVerificationSteps.find(opt => opt.value === step.verification_key)?.verification_key === "图像验证" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">图像选择</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Select
                                    value={step.img1}
                                    onValueChange={(value) => updateVerificationStep(step.id, "img1", value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="选择图像1" />
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
                                  <Select
                                    value={step.img2}
                                    onValueChange={(value) => updateVerificationStep(step.id, "img2", value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="选择图像2" />
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
                          )}
                          {step.verification_key === "检查数值范围" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">数值设置</Label>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">数值</Label>
                                  <Input
                                    type="number"
                                    value={step.value}
                                    onChange={(e) => updateVerificationStep(step.id, "value", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">最小值</Label>
                                  <Input
                                    type="number"
                                    value={step.min_value}
                                    onChange={(e) => updateVerificationStep(step.id, "min_value", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">最大值</Label>
                                  <Input
                                    type="number"
                                    value={step.max_value}
                                    onChange={(e) => updateVerificationStep(step.id, "max_value", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {step.verification_key === "检查文本内容" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">文本设置</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">文本内容</Label>
                                  <Input
                                    value={step.text}
                                    onChange={(e) => updateVerificationStep(step.id, "text", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">预期文本</Label>
                                  <Input
                                    value={step.expected_text}
                                    onChange={(e) => updateVerificationStep(step.id, "expected_text", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {step.verification_key === "检查元素状态" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">元素设置</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">元素名称</Label>
                                  <Input
                                    value={step.element_name}
                                    onChange={(e) => updateVerificationStep(step.id, "element_name", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">预期状态</Label>
                                  <Input
                                    value={step.expected_state}
                                    onChange={(e) => updateVerificationStep(step.id, "expected_state", e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
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
                <Link href="/test-cases">
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

