"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, X, ZoomIn, RotateCw, RotateCcw } from "lucide-react"
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
import { API_BASE_URL } from "@/lib/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

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
      "图像操作": ["获取图像", "获取截图", "获取操作界面"],
      "设备控制": ["串口开机", "串口关机", "串口关-开机", "SSH重启设备", "串口重启设备"],
      "其他操作": ["等待时间"]
    };
    
    // 获取所有步骤
    const allSteps = Object.entries((STEP_METHODS as StepMethods)?.操作步骤 || {}).map(([key, value]) => ({
      value: key,
      label: key,
      description: value.description,
      category: Object.entries(categories).find(([_, steps]) => steps.includes(key))?.[0] || "其他操作"
    }));
    
    // 按类别组织步骤
    const stepsByCategory: Record<string, {value: string, label: string, description?: string}[]> = {};
    
    // 初始化类别
    Object.keys(categories).forEach(category => {
      stepsByCategory[category] = [];
    });
    
    // 将步骤分组到对应类别
    allSteps.forEach(step => {
      if (stepsByCategory[step.category]) {
        stepsByCategory[step.category].push({
          value: step.value,
          label: step.label,
          description: step.description
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

    // 定义操作界面验证类别
    const operationCategories: Record<string, string[]> = {
      "元素验证": ["检查元素状态", "检查元素文本", "检查元素属性", "文本识别验证"],
      "截图验证": ["截图精准匹配", "截图包含匹配"],
      "交互验证": ["检查点击响应", "检查滑动响应", "检查输入响应"],
      "其他验证": []
    };
    
    // 获取所有验证步骤
    const allSteps = Object.entries((STEP_METHODS as StepMethods)?.验证步骤 || {}).map(([key, value]) => {
      // 查找步骤所属的类别
      let category = "其他验证";
      let stepType = "display"; // 默认为显示界面验证
      
      // 遍历类别，查找包含当前步骤的类别
      for (const [catName, steps] of Object.entries(categories)) {
        if (Array.isArray(steps) && steps.includes(key)) {
          category = catName;
          break;
        }
      }

      // 检查是否是操作界面验证类型
      for (const [catName, steps] of Object.entries(operationCategories)) {
        if (Array.isArray(steps) && steps.includes(key)) {
          category = catName;
          stepType = "operation";
          break;
        }
      }
      
      return {
        value: key,
        label: key,
        verification_key: value.verification_key,
        description: value.description,
        short_description: value.short_description || "",
        category,
        stepType
      };
    });
    
    // 按类别组织验证步骤
    const stepsByCategory: Record<string, {value: string, label: string, verification_key?: string, description: string, short_description: string, stepType: string}[]> = {};
    
    // 初始化类别
    Object.keys(categories).forEach(category => {
      stepsByCategory[category] = [];
    });
    Object.keys(operationCategories).forEach(category => {
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
          short_description: step.short_description,
          stepType: step.stepType
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
  stepType: "operation" | "display";
  reference_screenshot?: string;
  reference_content?: string;
  match_mode?: "精确匹配" | "模糊匹配";
  region?: string;
  threshold?: number;
  isImageLoading?: boolean;
  imageError?: string;
  operation_screenshot?: string; // 存储选择的操作界面截图步骤ID
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
  waitTimeMs?: number; // 添加等待时间属性（毫秒）
  step_type: "normal" | "visual";
  recorded_steps?: any[];
  operation_name?: string;
  stepType?: "create-environment" | "test-case" | "cleanup-environment";
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

// 添加步骤类型排序辅助函数
const getStepTypeOrder = (stepType: string | undefined) => {
  switch (stepType) {
    case 'create-environment':
      return 0;
    case 'test-case':
      return 1;
    case 'cleanup-environment':
      return 2;
    default:
      return 1;
  }
};

// 生成唯一 sessionId
function generateSessionId() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${dateStr}_${rand}`;
}

export default function NewTestCasePage({ initialData, mode = 'new' }: NewTestCasePageProps): React.ReactElement {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [projects, setProjects] = useState<Project[]>([])
  const [projectName, setProjectName] = useState("")
  const [projectId, setProjectId] = useState("")
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null)
  const [isStepDetailsOpen, setIsStepDetailsOpen] = useState(false)
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>(() => {
    if (initialData?.script_content) {
      try {
        const content = typeof initialData.script_content === 'string' 
          ? JSON.parse(initialData.script_content)
          : initialData.script_content;
          
        return content.operationSteps || [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0, step_type: "normal", stepType: "test-case" }];
      } catch (e) {
        console.error('Error parsing script_content:', e);
        return [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0, step_type: "normal", stepType: "test-case" }];
      }
    }
    return [{ id: 1, operation_key: "", button_name: "", x1: 0, y1: 0, x2: 0, y2: 0, step_type: "normal", stepType: "test-case" }];
  })
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>(() => {
    if (initialData?.script_content) {
      try {
        // 检查script_content的类型
        const content = typeof initialData.script_content === 'string'
          ? JSON.parse(initialData.script_content)
          : initialData.script_content;
          
        return content.verificationSteps?.map((step: any) => ({
          ...step,
          stepType: step.stepType || "display" // 确保现有步骤也有默认类型
        })) || [{ id: 1, verification_key: "", stepType: "display" }];
      } catch (e) {
        console.error('Error parsing script_content:', e);
        return [{ id: 1, verification_key: "", stepType: "display" }];
      }
    }
    return [{ id: 1, verification_key: "", stepType: "display" }];
  })
  const [testType, setTestType] = useState(initialData?.type || "功能测试")
  const [repeatCount, setRepeatCount] = useState(() => {
    if (initialData?.script_content) {
      try {
        // 检查script_content的类型
        const content = typeof initialData.script_content === 'string'
          ? JSON.parse(initialData.script_content)
          : initialData.script_content;
          
      return content.repeatCount || 1;
      } catch (e) {
        console.error('Error parsing script_content:', e);
        return 1;
      }
    }
    return 1;
  })

  // 在组件内部获取步骤选项
  const { stepsByCategory: operationStepsByCategory, allSteps: allOperationSteps } = useMemo(() => getOperationSteps(), []);
  const { stepsByCategory: verificationStepsByCategory, allSteps: allVerificationSteps } = useMemo(() => getVerificationSteps(), []);
  const buttonOptions = useMemo(() => getButtonOptions(), []);

  // 新增 sessionId
  const [sessionId] = useState(() => generateSessionId());

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // 先设置加载状态
        setIsLoading(true);
        
        const projectList = await projectSettingsAPI.getProjects()
        setProjects(projectList)
        
        // 设置默认项目
        if (projectList && projectList.length > 0) {
          // 如果是编辑模式且已有项目名称
          if (mode === 'edit' && initialData?.project_name) {
            setProjectName(initialData.project_name)
            // 找到对应的项目ID
            const foundProject = projectList.find(p => p.name === initialData.project_name)
            if (foundProject) {
              setProjectId(foundProject.id)
            }
          } else {
            // 使用创建时间最早的项目（最简单的方式）
            const earliestProject = projectList.reduce((earliest, current) => {
              const earliestTime = new Date(earliest.createTime).getTime()
              const currentTime = new Date(current.createTime).getTime()
              return currentTime < earliestTime ? current : earliest
            }, projectList[0])
            
            console.log('设置默认项目:', earliestProject.name);
            setProjectName(earliestProject.name)
            setProjectId(earliestProject.id)
          }
        } else {
          // 如果没有项目，记录日志
          console.warn('没有可用的项目，请先创建项目');
          // 可以考虑添加提示或者自动跳转到创建项目页面
        }
      } catch (error) {
        console.error('加载项目列表失败:', error)
        toast({
          title: "加载项目列表失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive"
        })
      } finally {
        // 完成加载，取消加载状态
        setIsLoading(false);
      }
    }
    
    loadProjects()
  }, [mode, initialData, toast])

  // 修改 addOperationStep 函数
  const addOperationStep = () => {
    const newId = operationSteps.length > 0 ? Math.max(...operationSteps.map((step) => step.id)) + 1 : 1;
    const newStep: OperationStep = { 
      id: newId, 
      operation_key: "", 
      button_name: "", 
      x1: 0, 
      y1: 0, 
      x2: 0, 
      y2: 0, 
      step_type: "normal", 
      stepType: "test-case" 
    };

    // 根据步骤类型插入到正确位置
    const newSteps = [...operationSteps];
    const newStepOrder = getStepTypeOrder(newStep.stepType);
    
    // 找到第一个大于新步骤顺序的位置
    const insertIndex = newSteps.findIndex(step => getStepTypeOrder(step.stepType) > newStepOrder);
    
    if (insertIndex === -1) {
      // 如果没有找到更大的顺序，添加到末尾
      newSteps.push(newStep);
    } else {
      // 在找到的位置插入
      newSteps.splice(insertIndex, 0, newStep);
    }
    
    setOperationSteps(newSteps);
  };

  const addVerificationStep = () => {
    const newId = verificationSteps.length > 0 ? Math.max(...verificationSteps.map((step) => step.id)) + 1 : 1;
    setVerificationSteps([...verificationSteps, { 
      id: newId, 
      verification_key: "",
      stepType: "display" // 默认为显示界面验证
    }]);
  };

  const removeOperationStep = (id: number) => {
    setOperationSteps(operationSteps.filter((step) => step.id !== id))
  }

  const removeVerificationStep = (id: number) => {
    setVerificationSteps(verificationSteps.filter((step) => step.id !== id))
  }

  // 修改 moveOperationStep 函数
  const moveOperationStep = (id: number, direction: "up" | "down") => {
    const index = operationSteps.findIndex((step) => step.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === operationSteps.length - 1)) {
      return;
    }

    const currentStep = operationSteps[index];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const targetStep = operationSteps[targetIndex];

    // 检查是否在同类型步骤内移动
    // 对于可视化录制步骤，允许在测试用例类型内移动
    if (currentStep.stepType !== targetStep.stepType && 
        !(currentStep.step_type === "visual" && targetStep.stepType === "test-case") &&
        !(currentStep.stepType === "test-case" && targetStep.step_type === "visual")) {
      return;
    }

    const newSteps = [...operationSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setOperationSteps(newSteps);
  };

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

  // 修改 updateOperationStep 函数
  const updateOperationStep = (id: number, field: keyof OperationStep, value: any) => {
    setOperationSteps((steps) => {
      const newSteps = steps.map((step) => {
        if (step.id === id) {
          const updatedStep = { ...step, [field]: value };
          if (field === 'button_name' && value && step.step_type === "normal") {
            const buttonConfig = (FUNCTIONS as Functions)[value];
            if (buttonConfig) {
              updatedStep.x1 = buttonConfig.touch[0];
              updatedStep.y1 = buttonConfig.touch[1];
              updatedStep.x2 = buttonConfig.screen[0];
              updatedStep.y2 = buttonConfig.screen[1];
            }
          }
          // 当操作类型变为"等待时间"时，初始化waitTimeMs属性为1000
          if (field === 'operation_key' && value === "等待时间") {
            updatedStep.waitTimeMs = 1000;
          }
          return updatedStep;
        }
        return step;
      });

      // 如果更新了步骤类型，重新排序
      if (field === 'stepType') {
        return newSteps.sort((a, b) => {
          // 保持可视化录制步骤在测试用例类型内
          if (a.step_type === "visual" && b.step_type === "visual") {
            return 0;
          }
          return getStepTypeOrder(a.stepType) - getStepTypeOrder(b.stepType);
        });
      }

      return newSteps;
    });
  };

  const updateVerificationStep = (id: number, field: keyof VerificationStep, value: any) => {
    setVerificationSteps((steps) =>
      steps.map((step) => {
        if (step.id === id) {
          const updatedStep = { ...step, [field]: value };
          // 如果更改了步骤类型，清空验证类型
          if (field === 'stepType') {
            updatedStep.verification_key = "";
          }
          return updatedStep;
        }
        return step;
      })
    );
  };

  const handleProjectChange = (name: string) => {
    // 如果选择了"暂无项目"选项，不进行任何操作
    if (name === "no-projects") {
      return;
    }
    
    setProjectName(name)
    const project = projects.find(p => p.name === name)
    if (project) {
      setProjectId(project.id)
    }
  }

  // 删除图片文件 - 前端直接处理
  const deleteImage = async (fileName: string) => {
    if (!fileName) return;

    try {
      // 从sessionStorage中删除
      sessionStorage.removeItem(`upload_${fileName}`);

      console.log(`图片删除成功: ${fileName}`);
      toast({
        title: "删除成功",
        description: "图片已成功删除",
      });
      return true;
    } catch (error) {
      console.error('图片删除错误:', error);
      toast({
        title: "删除失败",
        description: "图片删除失败，请重试",
        variant: "destructive"
      });
      return false;
    }
  };

  // 删除已存在的图片
  const deleteExistingImage = async (step: VerificationStep, field: keyof VerificationStep) => {
    const imageData = step[field];
    if (!imageData) return true; // 没有旧图片，直接返回成功
    
    try {
      let fileName: string | undefined;
      let fileUrl: string | undefined;
      
      // 尝试解析JSON数据
      if (typeof imageData === 'string') {
        if (imageData.startsWith('{')) {
          try {
            const parsedData = JSON.parse(imageData);
            fileName = parsedData.fileName;
            fileUrl = parsedData.url;
            
            // 如果没有fileName但有URL，尝试从URL提取文件名
            if (!fileName && fileUrl) {
              fileName = fileUrl.split('/').pop();
            }
          } catch (e) {
            // 解析失败，使用原始字符串
            fileUrl = imageData;
            fileName = imageData.split('/').pop();
          }
        } else {
          fileUrl = imageData;
          fileName = imageData.split('/').pop();
        }
      }
      
      // 如果有文件名或URL，尝试删除
      if (fileName || fileUrl) {
        console.log(`删除旧图片: ${fileName || fileUrl}`);
        
        // 如果只有文件名没有完整URL，构建可能的URL
        if (fileName && !fileUrl) {
          // 尝试构建完整的API URL
          fileUrl = fileName.includes('screen_capture') ? 
            `/api/files/screenshots/${fileName}` : 
            `/api/files/images/${fileName}`;
        }
        
        await deleteImage(fileUrl || fileName || '');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('删除旧图片时出错:', error);
      // 即使删除失败也继续上传新图片
      return false;
    }
  };

  // 生成上传图片的文件名，使用验证步骤ID
  const getNextUploadFileName = (field: keyof VerificationStep, stepId: number, isManualUpload: boolean = false) => {
    // 使用步骤ID作为文件名的末尾数字
    const idStr = stepId.toString().padStart(3, '0');

    // 如果是手动上传，统一使用简单格式
    if (isManualUpload) {
      return `${sessionId}_${idStr}.png`;
    }

    // 自动截图时根据字段类型区分前缀
    const prefix = field === 'reference_screenshot' ? 'screen_capture' : 'upload';
    if (prefix === 'screen_capture') {
      return `${prefix}_${sessionId}_${idStr}.png`;
    }

    // 默认返回upload格式
    return `${prefix}_${sessionId}_${idStr}.png`;
  };

  // 保存图片到upload目录的函数
  const saveImageToUploadDirectory = async (fileName: string, base64Data: string) => {
    try {
      // 将Base64数据转换为Blob
      const response = await fetch(base64Data);
      const blob = await response.blob();

      // 创建FormData
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('fileName', fileName);
      formData.append('fileType', 'screenshot'); // 指定保存到前端upload目录

      // 发送到后端API保存文件
      const uploadResponse = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`保存文件失败: ${uploadResponse.statusText}`);
      }

      const result = await uploadResponse.json();
      console.log('文件保存成功:', result);
      return result;
    } catch (error) {
      console.error('保存图片到upload目录失败:', error);
      throw error;
    }
  };

  // 处理图片上传 - 前端直接处理
  const handleImageUpload = async (id: number, field: keyof VerificationStep, file: File) => {
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "文件类型错误",
        description: "请上传图片文件（JPG、PNG等）",
        variant: "destructive"
      });
      return;
    }

    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      // 设置加载状态
      updateVerificationStep(id, "isImageLoading", true);
      updateVerificationStep(id, "imageError", undefined);

      // 生成自定义文件名 - 手动上传标记为true
      const customFileName = getNextUploadFileName(field, id, true);

      // 显示上传中提示
      toast({
        title: "上传中",
        description: "正在处理图片，请稍候...",
      });

      // 前端直接处理文件
      const fileReader = new FileReader();

      fileReader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const fileName = customFileName; // 保存到局部变量

          // 创建一个Image对象来验证图片
          const img = document.createElement('img');
          img.onload = async () => {
            try {
              // 图片加载成功，先保存到文件系统
              await saveImageToUploadDirectory(fileName, result);

              // 保存文件名到验证步骤
              updateVerificationStep(id, field, fileName);
              updateVerificationStep(id, "isImageLoading", false);

              // 将文件数据保存到sessionStorage，用于后续处理
              const fileData = {
                name: fileName,
                data: result,
                type: file.type,
                size: file.size,
                timestamp: Date.now()
              };
              sessionStorage.setItem(`upload_${fileName}`, JSON.stringify(fileData));

              toast({
                title: "上传成功",
                description: "图片已成功保存到upload目录",
              });
            } catch (error) {
              console.error('保存图片到文件系统失败:', error);
              updateVerificationStep(id, "isImageLoading", false);
              updateVerificationStep(id, "imageError", "保存图片失败");
              toast({
                title: "保存失败",
                description: "图片保存到文件系统失败",
                variant: "destructive"
              });
            }
          };

          img.onerror = () => {
            updateVerificationStep(id, "isImageLoading", false);
            updateVerificationStep(id, "imageError", "图片格式无效");
            toast({
              title: "处理失败",
              description: "图片格式无效",
              variant: "destructive"
            });
          };

          img.src = result;

        } catch (error) {
          console.error('图片处理错误:', error);
          updateVerificationStep(id, "isImageLoading", false);
          updateVerificationStep(id, "imageError", error instanceof Error ? error.message : "图片处理失败");

          toast({
            title: "处理失败",
            description: error instanceof Error ? error.message : "图片处理失败，请重试",
            variant: "destructive"
          });
        }
      };

      fileReader.onerror = () => {
        updateVerificationStep(id, "isImageLoading", false);
        updateVerificationStep(id, "imageError", "文件读取失败");

        toast({
          title: "读取失败",
          description: "文件读取失败，请重试",
          variant: "destructive"
        });
      };

      // 读取文件为Data URL
      fileReader.readAsDataURL(file);

    } catch (error) {
      console.error('图片上传错误:', error);
      updateVerificationStep(id, "isImageLoading", false);
      updateVerificationStep(id, "imageError", error instanceof Error ? error.message : "图片上传失败");

      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "图片上传失败，请重试",
        variant: "destructive"
      });
    }
  };

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

    // 验证验证步骤是否完整
    const validationResult = validateVerificationSteps();
    if (!validationResult.isValid) {
      const errorMessages = validationResult.message.split('\n');
      const displayMessage = errorMessages.length > 3
        ? `${errorMessages.slice(0, 3).join('\n')}\n... 还有 ${errorMessages.length - 3} 个错误`
        : validationResult.message;

      toast({
        title: "验证步骤不完整",
        description: displayMessage,
        variant: "destructive"
      })

      // 自动切换到验证步骤标签页
      const verificationTab = document.querySelector('[value="verification"]') as HTMLElement;
      if (verificationTab) {
        verificationTab.click();
      }

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
        project_id: projectId,
        sessionId: sessionId  // 添加sessionId到测试用例数据中
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


  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<"operation" | "verification">("operation")
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false)
  const [deviceEvents, setDeviceEvents] = useState<any[]>([])
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const [recordingName, setRecordingName] = useState("")

  // 开始可视化操作录制
  const startVisualRecording = () => {
    setRecordingType("operation")
    setDeviceEvents([])
    setIsRecording(true)
    setRecordingDialogOpen(true)

    // 创建WebSocket连接
    const wsUrl = `ws://${window.location.hostname}:5000/ws/touch-monitor`
    console.log('正在连接到WebSocket服务器:', wsUrl)
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('WebSocket连接已建立')
      toast({
        title: "连接成功",
        description: "已连接到触摸屏监控服务",
      })
      // 延迟发送start命令，确保服务器准备就绪
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const startCommand = JSON.stringify({ action: 'start' })
          console.log('发送start命令:', startCommand)
          ws.send(startCommand)
        } else {
          console.error('WebSocket连接已关闭，无法发送start命令')
          toast({
            title: "连接错误",
            description: "WebSocket连接已关闭，请重试",
            variant: "destructive"
          })
        }
      }, 1000)
    }
    
    ws.onmessage = (event) => {
      console.log('收到WebSocket消息:', event.data)
      try {
        const data = JSON.parse(event.data)
        
        // 检查错误消息
        if (data.type === 'error') {
          console.error('收到错误消息:', data.message)
          toast({
            title: "触摸监控错误",
            description: data.message,
            variant: "destructive"
          })
          return
        }
        
        // 更新事件列表
        setDeviceEvents(prev => [...prev, {
          ...data,
          timestamp: new Date().toISOString()
        }])
        
        // 根据事件类型自动生成测试步骤
        if (data.type === 'touch_end') {
          console.log('处理touch_end事件:', data)
          const newId = Math.max(...operationSteps.map((step) => step.id), 0) + 1
          const newStep: OperationStep = {
            id: newId,
            operation_key: "点击按钮",
            button_name: `坐标 (${data.x.toFixed(1)}, ${data.y.toFixed(1)})`,
            x1: data.x,
            y1: data.y,
            x2: data.x,
            y2: data.y,
            step_type: "visual"
          }
          console.log('添加新的操作步骤:', newStep)
          setOperationSteps(prev => [...prev, newStep])
        }
      } catch (error: any) {
        console.error('处理WebSocket消息时出错:', error)
        toast({
          title: "数据处理错误",
          description: `处理触摸事件数据时出错: ${error.message}`,
          variant: "destructive"
        })
      }
    }
    
    ws.onclose = (event) => {
      console.log('WebSocket连接已关闭:', event.code, event.reason)
      setWsConnection(null)
      setIsRecording(false)
      if (!event.wasClean) {
        toast({
          title: "连接异常断开",
          description: "与触摸屏监控服务的连接意外断开，请重试",
          variant: "destructive"
        })
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error)
      toast({
        title: "连接错误",
        description: "无法连接到触摸屏监控服务，请确保后端服务正在运行",
        variant: "destructive"
      })
    }
    
    setWsConnection(ws)
  }

  // 停止录制
  const stopRecording = () => {
    if (wsConnection) {
      console.log('正在停止录制')
      try {
        wsConnection.send(JSON.stringify({ action: 'stop' }))
        wsConnection.close()
      } catch (error) {
        console.error('停止录制时出错:', error)
      }
    }
    setIsRecording(false)
    setRecordingDialogOpen(false)
    setWsConnection(null)
  }

  const saveRecording = () => {
    if (!recordingName.trim()) {
      toast({
        title: "错误",
        description: "请输入操作名称",
        variant: "destructive"
      });
      return;
    }

    const newId = Math.max(...operationSteps.map((step) => step.id)) + 1;
    const newStep: OperationStep = {
      id: newId,
      operation_key: "可视化录制",
      button_name: `录制步骤 ${deviceEvents.length} 个操作`,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      step_type: "visual",
      recorded_steps: deviceEvents,
      operation_name: recordingName.trim(),
      stepType: "test-case"
    };

    // 使用与 addOperationStep 相同的排序逻辑
    const newSteps = [...operationSteps];
    const newStepOrder = getStepTypeOrder(newStep.stepType);
    
    // 找到第一个大于新步骤顺序的位置
    const insertIndex = newSteps.findIndex(step => getStepTypeOrder(step.stepType) > newStepOrder);
    
    if (insertIndex === -1) {
      // 如果没有找到更大的顺序，添加到末尾
      newSteps.push(newStep);
    } else {
      // 在找到的位置插入
      newSteps.splice(insertIndex, 0, newStep);
    }
    
    setOperationSteps(newSteps);
    setRecordingName("");
    stopRecording();
  };

  // 统计当前截图数量，生成下一个文件名
  const getNextScreenCaptureFileName = (stepId: number) => {
    // 使用步骤ID作为文件名的末尾数字
    const idStr = stepId.toString().padStart(3, '0');
    return `screen_capture_${sessionId}_${idStr}.png`;
  };

  // 修改 handleScreenCapture 支持自定义文件名
  const handleScreenCapture = async (id: number, field: keyof VerificationStep) => {
    try {
      updateVerificationStep(id, "isImageLoading", true);
      updateVerificationStep(id, "imageError", undefined);
      const currentStep = verificationSteps.find(step => step.id === id);
      if (currentStep) {
        await deleteExistingImage(currentStep, field);
      }
      toast({ title: "获取中", description: "正在获取操作界面截图，请稍候..." });
      // 生成自定义文件名
      const customFileName = getNextScreenCaptureFileName(id);
      // 构建请求URL，使用后端API基础URL
      const url = `${API_BASE_URL}/api/screen/capture?fileName=${encodeURIComponent(customFileName)}${initialData?.id ? `&testCaseId=${initialData.id}` : ''}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取失败');
      }
      const result = await response.json();
      if (result.success) {
        // 后端已经保存了文件，直接使用返回的文件名
        if (result.filename) {
          // 保存文件名到验证步骤
          updateVerificationStep(id, field, result.filename);
        } else {
          // 兼容性处理：使用自定义文件名
          updateVerificationStep(id, field, customFileName);
        }

        updateVerificationStep(id, "isImageLoading", false);

        // 自动设置 operation_screenshot
        const operationInterfaceStep = operationSteps.find(step => step.operation_key === "获取操作界面");
        if (operationInterfaceStep) {
          updateVerificationStep(id, "operation_screenshot", operationInterfaceStep.id.toString());
        }

        toast({ title: "获取成功", description: "操作界面截图已成功获取" });
      } else {
        throw new Error(result.error || '获取失败');
      }
    } catch (error) {
      updateVerificationStep(id, "isImageLoading", false);
      updateVerificationStep(id, "imageError", error instanceof Error ? error.message : "获取操作界面截图失败");
      toast({ title: "获取失败", description: error instanceof Error ? error.message : "获取操作界面截图失败，请重试", variant: "destructive" });
    }
  };

  // 添加图片预览相关状态
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | undefined>()
  const [imageTitle, setImageTitle] = useState("")
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)

  // 处理图片点击预览
  const handleImagePreview = (imageFileName: string, title: string = "图片预览") => {
    if (!imageFileName) {
      toast({
        title: "无法预览",
        description: "图片文件名为空，无法预览",
        variant: "destructive"
      });
      return;
    }
    setPreviewImage(imageFileName);
    setImageTitle(title);
    setZoomLevel(1);
    setRotation(0);
    setImagePreviewOpen(true);
  }
  
  // 放大图片
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3))
  }
  
  // 缩小图片
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5))
  }
  
  // 旋转图片
  const rotateImage = (direction: 'clockwise' | 'counterclockwise') => {
    setRotation(prev => {
      const change = direction === 'clockwise' ? 90 : -90
      return prev + change
    })
  }

  // 获取图片URL，处理文件名格式和sessionStorage数据
  const getImageUrl = (imgData: string | undefined): string | undefined => {
    if (!imgData) return undefined;

    // 如果是完整的URL（包含http或/），直接返回
    if (imgData.includes('/') || imgData.startsWith('http')) {
      return imgData;
    }

    // 检查sessionStorage中是否有对应的图片数据
    try {
      const storedData = sessionStorage.getItem(`upload_${imgData}`);
      if (storedData) {
        const fileData = JSON.parse(storedData);
        if (fileData.data) {
          // 返回Base64数据URL
          return fileData.data;
        }
      }
    } catch (error) {
      console.warn('读取sessionStorage图片数据失败:', error);
    }

    // 否则认为是文件名，拼接 /img/upload/
    const timestamp = Date.now();
    return `/img/upload/${imgData}?t=${timestamp}`;
  };



  // 处理图片加载错误，尝试多种URL格式
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, stepId: number, imageData: string) => {
    updateVerificationStep(stepId, "imageError", "无法加载图片，请尝试重新获取");
    console.error('图片加载失败:', imageData);
  };

  // 验证验证步骤是否完整
  const validateVerificationSteps = () => {
    const errors: string[] = [];

    // 检查是否至少有一个验证步骤
    if (verificationSteps.length === 0) {
      errors.push("请至少添加一个验证步骤");
      return {
        isValid: false,
        message: errors.join('\n')
      };
    }

    verificationSteps.forEach((step, index) => {
      const stepNumber = index + 1;

      // 检查验证类型是否已选择
      if (!step.verification_key || step.verification_key.trim() === "") {
        errors.push(`验证步骤 ${stepNumber}: 请选择验证类型`);
        return;
      }

      // 根据验证类型检查必填字段
      switch (step.verification_key) {
        // 只有截图验证类型需要参考图片
        case "截图精准匹配":
          // 精准匹配需要参考截图
          if (!step.reference_screenshot) {
            errors.push(`验证步骤 ${stepNumber}: 请获取参考截图`);
          }
          break;

        case "截图包含匹配":
          // 包含匹配需要参考内容
          if (!step.reference_content) {
            errors.push(`验证步骤 ${stepNumber}: 请上传参考内容图片`);
          }
          break;

        case "检查数值范围":
          // 数值验证需要最小值和最大值
          if (!step.min_value && step.min_value !== "0") {
            errors.push(`验证步骤 ${stepNumber}: 请设置最小值`);
          }
          if (!step.max_value && step.max_value !== "0") {
            errors.push(`验证步骤 ${stepNumber}: 请设置最大值`);
          }
          break;

        case "检查元素状态":
          // 元素状态验证需要元素名称和期望状态
          if (!step.element_name || step.element_name.trim() === "") {
            errors.push(`验证步骤 ${stepNumber}: 请输入元素名称`);
          }
          if (!step.expected_state || step.expected_state.trim() === "") {
            errors.push(`验证步骤 ${stepNumber}: 请选择期望状态`);
          }
          break;

        case "检查元素文本":
        case "文本识别验证":
          // 文本验证需要期望文本
          if (!step.expected_text || step.expected_text.trim() === "") {
            errors.push(`验证步骤 ${stepNumber}: 请输入期望文本`);
          }
          break;

        case "检查元素属性":
          // 属性验证需要元素名称和期望值
          if (!step.element_name || step.element_name.trim() === "") {
            errors.push(`验证步骤 ${stepNumber}: 请输入元素名称`);
          }
          if (!step.value || step.value.trim() === "") {
            errors.push(`验证步骤 ${stepNumber}: 请输入期望值`);
          }
          break;



        case "检查点击响应":
        case "检查滑动响应":
        case "检查输入响应":
          // 交互验证需要操作界面截图
          if (step.stepType === "operation" && !step.operation_screenshot) {
            errors.push(`验证步骤 ${stepNumber}: 请选择操作界面截图步骤`);
          }
          break;
      }

      // 检查操作界面验证类型是否选择了操作界面截图步骤
      if (step.stepType === "operation") {
        const operationInterfaceSteps = operationSteps.filter(opStep =>
          opStep.operation_key === "获取操作界面"
        );

        if (operationInterfaceSteps.length === 0) {
          errors.push(`验证步骤 ${stepNumber}: 操作界面验证需要先添加"获取操作界面"操作步骤`);
        } else if (!step.operation_screenshot) {
          errors.push(`验证步骤 ${stepNumber}: 请选择操作界面截图步骤`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? errors.join('\n') : ""
    };
  };

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
                <Select 
                  value={projectName} 
                  onValueChange={handleProjectChange} 
                  disabled={isLoading || projects.length === 0}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "加载项目中..." : projects.length === 0 ? "暂无项目，请先创建项目" : "选择项目"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length > 0 ? (
                      projects.map((project) => (
                      <SelectItem key={project.id} value={project.name}>
                        {project.name}
                      </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-projects" disabled>
                        暂无项目，请先创建项目
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {projects.length === 0 && !isLoading && (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-red-500">请先在项目设置中创建项目</p>
                    <Button 
                      variant="link" 
                      className="text-sm text-blue-500 hover:text-blue-700 p-0 h-auto" 
                      onClick={() => router.push('/settings?tab=project')}
                    >
                      前往创建项目
                    </Button>
                  </div>
                )}
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
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center"
                    onClick={startVisualRecording}
                    disabled={isRecording}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" className={isRecording ? "fill-red-500" : ""} />
                    </svg>
                    {isRecording ? "录制中..." : "开始可视化录制"}
                  </Button>
                </div>

                {operationSteps.map((step, index) => (
                  <Card key={step.id} className={`${
                    step.stepType === "create-environment"
                      ? "border-blue-300 bg-blue-100"
                      : step.stepType === "test-case"
                        ? "border-blue-500 bg-blue-200"
                        : step.stepType === "cleanup-environment"
                          ? "border-gray-300 bg-gray-100"
                          : ""
                  }`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            步骤 {index + 1}
                            {step.step_type === "visual" && (
                              <Badge variant="outline" className="ml-2">
                                可视化录制
                              </Badge>
                            )}
                            {step.stepType && (
                              <Badge
                                variant="outline"
                                className={`ml-2 ${
                                  step.stepType === "create-environment"
                                    ? "bg-blue-200 text-blue-800"
                                    : step.stepType === "test-case"
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-200 text-gray-800"
                                }`}
                              >
                                {step.stepType === "create-environment"
                                  ? "创建环境"
                                  : step.stepType === "test-case"
                                    ? "测试用例"
                                    : "清除环境"}
                              </Badge>
                            )}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {step.step_type === "visual" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => {
                                setSelectedStepId(step.id);
                                setIsStepDetailsOpen(true);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                              </svg>
                            </Button>
                          )}
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
                      {step.step_type === "visual" ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="block text-sm mb-1">操作名称</Label>
                              <Input
                                value={step.operation_name || ""}
                                onChange={(e) => updateOperationStep(step.id, "operation_name", e.target.value)}
                                placeholder="输入操作名称"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="block text-sm mb-1">步骤类型</Label>
                              <Select
                                value={step.stepType || "test-case"}
                                onValueChange={(value) => updateOperationStep(step.id, "stepType", value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择步骤类型" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="create-environment">创建环境</SelectItem>
                                  <SelectItem value="test-case">测试用例</SelectItem>
                                  <SelectItem value="cleanup-environment">清除环境</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            包含 {step.recorded_steps?.length || 0} 个触摸事件
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="block text-sm mb-1">操作类型</Label>
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
                                        <div className="flex flex-col">
                                          <span>{option.label}</span>
                                          {option.description && (
                                            <span className="text-xs text-gray-500">{option.description}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="block text-sm mb-1">步骤类型</Label>
                            <Select
                              value={step.stepType || "test-case"}
                              onValueChange={(value) => updateOperationStep(step.id, "stepType", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择步骤类型" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="create-environment">创建环境</SelectItem>
                                <SelectItem value="test-case">测试用例</SelectItem>
                                <SelectItem value="cleanup-environment">清除环境</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(step.operation_key === "点击按钮" || step.operation_key === "长按按钮") && (
                            <div className="space-y-2">
                              <Label className="block text-sm mb-1">按钮</Label>
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
                              <Label className="block text-sm mb-1">滑动坐标</Label>
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
                              <Label className="block text-sm mb-1">等待时间 (毫秒)</Label>
                              <Input
                                type="number"
                                value={step.waitTime || 1000}
                                onChange={(e) => updateOperationStep(step.id, "waitTime", parseInt(e.target.value) || 1000)}
                              />
                            </div>
                          )}
                          {step.operation_key === "等待时间" && (
                            <div className="space-y-2">
                              <Label className="block text-sm mb-1">等待时间 (毫秒)</Label>
                              <Input
                                type="number"
                                value={step.waitTimeMs || 1000}
                                onChange={(e) => updateOperationStep(step.id, "waitTimeMs", parseInt(e.target.value) || 1000)}
                                min="0"
                              />
                              <p className="text-xs text-gray-500">默认值：1000毫秒 (1秒)</p>
                            </div>
                          )}
                        </div>
                      )}
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
                            <Label htmlFor={`verification-type-${step.id}`} className="text-sm font-medium">
                              验证步骤类型
                            </Label>
                            <Select
                              value={step.stepType}
                              onValueChange={(value) => updateVerificationStep(step.id, "stepType", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择验证步骤类型" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="display">显示界面验证</SelectItem>
                                <SelectItem value="operation">操作界面验证</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

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
                                {Object.entries(verificationStepsByCategory)
                                  .filter(([category, options]) => 
                                    options.some(opt => opt.stepType === step.stepType)
                                  )
                                  .map(([category, options]) => (
                                    <div key={category}>
                                      <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
                                        {category}
                                      </div>
                                      {options
                                        .filter(opt => opt.stepType === step.stepType)
                                        .map((option) => (
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
                                        .filter(op => op.type === "获取图像" || op.type === "获取截图" || op.type === "获取操作界面")
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
                                        .filter(op => op.type === "获取图像" || op.type === "获取截图" || op.type === "获取操作界面")
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
                          {step.verification_key === "文本识别验证" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">文本识别设置</Label>
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">预期文本</Label>
                                  <Input
                                    value={step.expected_text}
                                    onChange={(e) => updateVerificationStep(step.id, "expected_text", e.target.value)}
                                    placeholder="输入需要验证的文本内容"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">图像选择</Label>
                                  <Select
                                    value={step.operation_screenshot}
                                    onValueChange={(value) => updateVerificationStep(step.id, "operation_screenshot", value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="选择操作界面截图" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operationSteps
                                        .map((op, opIndex) => ({
                                          id: op.id,
                                          index: opIndex,
                                          type: op.operation_key
                                        }))
                                        .filter(op => op.type === "获取操作界面")
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
                          {step.verification_key === "截图精准匹配" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">参考截图上传</Label>
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">图像选择</Label>
                                  <Select
                                    value={step.operation_screenshot}
                                    onValueChange={(value) => updateVerificationStep(step.id, "operation_screenshot", value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="选择操作界面截图" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operationSteps
                                        .map((op, opIndex) => ({
                                          id: op.id,
                                          index: opIndex,
                                          type: op.operation_key
                                        }))
                                        .filter(op => op.type === "获取操作界面")
                                        .map((op) => (
                                          <SelectItem key={op.id} value={op.id.toString()}>
                                            步骤 {op.index + 1}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="border rounded-md p-4">
                                  <Label className="text-xs text-gray-500 mb-2 block">上传操作界面截图</Label>
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className="flex items-center justify-center w-full">
                                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                          <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                          </svg>
                                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">点击上传</span> 或拖拽文件</p>
                                          <p className="text-xs text-gray-500">PNG, JPG, WEBP, GIF (最大 5MB)</p>
                                        </div>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImageUpload(step.id, "reference_screenshot", file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                    <div className="flex items-center justify-center w-full mt-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => handleScreenCapture(step.id, "reference_screenshot")}
                                      >
                                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <rect width="18" height="14" x="3" y="5" rx="2" stroke="currentColor" strokeWidth="2"/>
                                          <path d="M3 7c0-1.886 0-2.828.586-3.414C4.172 3 5.114 3 7 3h10c1.886 0 2.828 0 3.414.586C21 4.172 21 5.114 21 7" stroke="currentColor" strokeWidth="2"/>
                                          <path d="M8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2"/>
                                          <path d="m21 15-2-2-4 4-2-2-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        获取操作界面截图
                                      </Button>
                                    </div>
                                    {step.isImageLoading ? (
                                      <div className="flex items-center justify-center p-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                        <span className="ml-2 text-sm text-gray-500">加载中...</span>
                                      </div>
                                    ) : step.reference_screenshot ? (
                                      <div className="relative w-full">
                                        <div className="border rounded-md p-2 bg-white">
                                          <img 
                                            src={getImageUrl(step.reference_screenshot)}
                                            alt="参考截图预览" 
                                            className="max-h-40 mx-auto object-contain rounded-md cursor-pointer"
                                            onClick={() => handleImagePreview(step.reference_screenshot!, "参考截图预览")}
                                            onError={(e) => handleImageError(e, step.id, step.reference_screenshot!)}
                                          />
                                          {step.imageError && (
                                            <div className="text-center p-2 text-red-500 text-sm">
                                              <p>图片加载失败</p>
                                              <p className="text-xs break-all">{step.imageError}</p>
                                              <p className="text-xs mt-1">请尝试重新上传</p>
                                            </div>
                                          )}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          className="absolute top-0 right-0 h-6 w-6"
                                          onClick={async () => {
                                            if (step.reference_screenshot) {
                                              // 尝试获取文件名
                                              let fileName;
                                              try {
                                                if (typeof step.reference_screenshot === 'string' && step.reference_screenshot.startsWith('{')) {
                                                  const data = JSON.parse(step.reference_screenshot);
                                                  fileName = data.fileName;
                                                } else if (typeof step.reference_screenshot === 'string') {
                                                  fileName = step.reference_screenshot.split('/').pop();
                                                }
                                              } catch (e: unknown) {
                                                fileName = step.reference_screenshot;
                                              }
                                              
                                              if (fileName || typeof step.reference_screenshot === 'string') {
                                                await deleteImage(fileName || step.reference_screenshot);
                                              }
                                            }
                                            updateVerificationStep(step.id, "reference_screenshot", undefined);
                                            updateVerificationStep(step.id, "imageError", undefined);
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">匹配阈值</Label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="range"
                                      min="0.5"
                                      max="1"
                                      step="0.01"
                                      value={step.threshold || 0.99}
                                      onChange={(e) => updateVerificationStep(step.id, "threshold", parseFloat(e.target.value))}
                                      className="w-full"
                                    />
                                    <span className="text-sm w-12">{(step.threshold || 0.99).toFixed(2)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">值越高要求匹配越精确（0.99表示99%相似度）</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {step.verification_key === "截图包含匹配" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">参考截图上传</Label>
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">图像选择</Label>
                                  <Select
                                    value={step.operation_screenshot}
                                    onValueChange={(value) => updateVerificationStep(step.id, "operation_screenshot", value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="选择操作界面截图" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operationSteps
                                        .map((op, opIndex) => ({
                                          id: op.id,
                                          index: opIndex,
                                          type: op.operation_key
                                        }))
                                        .filter(op => op.type === "获取操作界面")
                                        .map((op) => (
                                          <SelectItem key={op.id} value={op.id.toString()}>
                                            步骤 {op.index + 1}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="border rounded-md p-4">
                                  <Label className="text-xs text-gray-500 mb-2 block">上传参考截图</Label>
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className="flex items-center justify-center w-full">
                                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                          <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                          </svg>
                                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">点击上传</span> 或拖拽文件</p>
                                          <p className="text-xs text-gray-500">PNG, JPG, WEBP, GIF (最大 5MB)</p>
                                        </div>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImageUpload(step.id, "reference_content", file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                    <div className="flex items-center justify-center w-full mt-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => handleScreenCapture(step.id, "reference_content")}
                                      >
                                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <rect width="18" height="14" x="3" y="5" rx="2" stroke="currentColor" strokeWidth="2"/>
                                          <path d="M3 7c0-1.886 0-2.828.586-3.414C4.172 3 5.114 3 7 3h10c1.886 0 2.828 0 3.414.586C21 4.172 21 5.114 21 7" stroke="currentColor" strokeWidth="2"/>
                                          <path d="M8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2"/>
                                          <path d="m21 15-2-2-4 4-2-2-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        获取操作界面截图
                                      </Button>
                                    </div>
                                    {step.isImageLoading ? (
                                      <div className="flex items-center justify-center p-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                        <span className="ml-2 text-sm text-gray-500">加载中...</span>
                                      </div>
                                    ) : step.reference_content ? (
                                      <div className="relative w-full">
                                        <div className="border rounded-md p-2 bg-white">
                                          <img 
                                            src={getImageUrl(step.reference_content)}
                                            alt="参考内容预览" 
                                            className="max-h-40 mx-auto object-contain rounded-md cursor-pointer"
                                            onClick={() => handleImagePreview(step.reference_content!, "参考内容预览")}
                                            onError={(e) => handleImageError(e, step.id, step.reference_content!)}
                                          />
                                          {step.imageError && (
                                            <div className="text-center p-2 text-red-500 text-sm">
                                              <p>图片加载失败</p>
                                              <p className="text-xs break-all">{step.imageError}</p>
                                              <p className="text-xs mt-1">请尝试重新上传</p>
                                            </div>
                                          )}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          className="absolute top-0 right-0 h-6 w-6"
                                          onClick={async () => {
                                            if (step.reference_content) {
                                              // 尝试获取文件名
                                              let fileName;
                                              try {
                                                if (typeof step.reference_content === 'string' && step.reference_content.startsWith('{')) {
                                                  const data = JSON.parse(step.reference_content);
                                                  fileName = data.fileName;
                                                } else if (typeof step.reference_content === 'string') {
                                                  fileName = step.reference_content.split('/').pop();
                                                }
                                              } catch (e: unknown) {
                                                fileName = step.reference_content;
                                              }
                                              
                                              if (fileName || typeof step.reference_content === 'string') {
                                                await deleteImage(fileName || step.reference_content);
                                              }
                                            }
                                            updateVerificationStep(step.id, "reference_content", undefined);
                                            updateVerificationStep(step.id, "imageError", undefined);
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1">匹配阈值</Label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="range"
                                      min="0.5"
                                      max="1"
                                      step="0.01"
                                      value={step.threshold || 1.00}
                                      onChange={(e) => updateVerificationStep(step.id, "threshold", parseFloat(e.target.value))}
                                      className="w-full"
                                    />
                                    <span className="text-sm w-12">{(step.threshold || 1.00).toFixed(2)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">值越高要求匹配越精确（1.00表示100%相似度）</p>
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

      {/* 可视化录制对话框 */}
      <Dialog open={recordingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          stopRecording();
        }
        setRecordingDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              可视化操作录制
              {isRecording && (
                <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 animate-pulse">
                  录制中
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              实时监控并记录触摸屏操作，自动生成测试步骤。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <Label htmlFor="recording-name" className="text-sm font-medium">
                操作名称 <span className="text-red-500">*</span>
              </Label>
              <div className="w-1/2">
                <Input
                  id="recording-name"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  placeholder="请输入操作名称"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mb-4 p-4 bg-black/5 rounded-md">
              <h4 className="text-sm font-medium mb-2">触摸事件流</h4>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {deviceEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">环境配置中...</div>
                ) : (
                  <div className="space-y-2">
                    {deviceEvents.map((event, index) => (
                      <div key={index} className="text-xs border-l-2 border-black pl-2 py-1">
                        <span className="text-muted-foreground">[{new Date(event.timestamp).toLocaleTimeString()}]</span>{" "}
                        <span className="font-medium">{event.type}</span>
                        {event.x !== undefined && (
                          <span className="text-blue-600"> X: {event.x.toFixed(1)}</span>
                        )}
                        {event.y !== undefined && (
                          <span className="text-blue-600"> Y: {event.y.toFixed(1)}</span>
                        )}
                        {event.duration !== undefined && (
                          <span className="text-purple-600"> 持续: {event.duration.toFixed(3)}秒</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              正在监听触摸屏事件，每次触摸将自动生成对应的测试步骤。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={stopRecording}>
              停止录制
            </Button>
            <Button 
              variant="default" 
              onClick={saveRecording} 
              disabled={deviceEvents.length === 0 || !recordingName.trim()}
            >
              保存录制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 步骤详情对话框 */}
      <Dialog open={isStepDetailsOpen} onOpenChange={setIsStepDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>步骤详情</DialogTitle>
            <DialogDescription>
              查看录制的触摸事件详情
            </DialogDescription>
          </DialogHeader>
              {selectedStepId && (
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>操作名称</Label>
                    <Input
                      value={operationSteps.find(step => step.id === selectedStepId)?.operation_name || ""}
                      onChange={(e) => updateOperationStep(selectedStepId, "operation_name", e.target.value)}
                      placeholder="输入操作名称"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    录制的触摸事件详情：
                  </div>
                </div>
              )}
            <ScrollArea className="h-[300px] rounded-md border p-2">
              {selectedStepId && operationSteps.find(step => step.id === selectedStepId)?.recorded_steps?.map((event, index) => (
                <div key={index} className="text-xs border-l-2 border-black pl-2 py-1">
                  <span className="text-muted-foreground">[{new Date(event.timestamp).toLocaleTimeString()}]</span>{" "}
                  <span className="font-medium">{event.type}</span>
                  {event.x !== undefined && (
                    <span className="text-blue-600"> X: {event.x.toFixed(1)}</span>
                  )}
                  {event.y !== undefined && (
                    <span className="text-blue-600"> Y: {event.y.toFixed(1)}</span>
                  )}
                  {event.duration !== undefined && (
                    <span className="text-purple-600"> 持续: {event.duration.toFixed(3)}秒</span>
                  )}
                </div>
              ))}
            </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDetailsOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加图片预览对话框 */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-gray-800 max-h-[90vh] overflow-hidden">
          <div className="relative flex flex-col h-full">
            <DialogClose className="absolute right-2 top-2 z-10">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>

            <div className="flex justify-between items-center p-4 border-b border-gray-800 w-full">
              <div className="text-white">
                <h3 className="font-medium">{imageTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={() => zoomOut()}
                >
                  <ZoomIn className="h-5 w-5 rotate-180" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={() => zoomIn()}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={() => rotateImage('counterclockwise')}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={() => rotateImage('clockwise')}
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full relative flex items-center justify-center bg-black overflow-hidden">
              {previewImage && (
                <div
                  className="relative flex items-center justify-center w-full h-full max-h-[calc(90vh-140px)]"
                  style={{
                    overflow: "hidden",
                    padding: "20px"
                  }}
                >
                  <img
                    src={getImageUrl(previewImage)}
                    alt={imageTitle}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease",
                    }}
                    onError={() => {
                      toast({
                        title: "图片加载失败",
                        description: `无法加载图片: ${previewImage}`,
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
