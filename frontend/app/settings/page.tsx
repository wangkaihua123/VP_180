"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Save, Server, Key, User, Loader2, Laptop, Activity, X, Globe, Plus, Edit, Trash2, FolderPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { sshSettingsAPI, serialSettingsAPI, unifiedSettingsAPI } from "@/lib/api"
import type { SSHSettings, SerialPort, SerialSettings } from "@/app/api/routes"
import { Toaster } from "@/components/ui/toaster"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { systemSettingsAPI, IpSettings } from "@/lib/api/system-settings"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { projectSettingsAPI, Project } from "@/lib/api/project-settings"

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("ssh")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isCustomBaudRate, setIsCustomBaudRate] = useState(false)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState(false)
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  })
  
  const [settings, setSettings] = useState<SSHSettings>({
    host: "",
    port: 22,
    username: "",
    password: ""
  })
  const [serialSettings, setSerialSettings] = useState<SerialSettings>({
    serialPort: "",
    serialBaudRate: "9600"
  })
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([])
  const commonBaudRates = ["9600", "19200", "38400", "57600", "115200", "1500000"]
  const [serialConnected, setSerialConnected] = useState(false)
  const [sshConnected, setSshConnected] = useState(false)
  const [ipSettings, setIpSettings] = useState<IpSettings>({
    backend: {
      useFixedIp: false,
      fixedHost: 'localhost',
      fixedPort: 5000,
      customInput: false
    },
    frontend: {
      host: 'localhost',
      port: 3000
    }
  })

  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadSettings()
    loadSerialSettings()
    loadSerialPorts()
    loadIpSettings()
    loadProjects()
    checkSerialConnection()
    checkSshConnection()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await sshSettingsAPI.get()
      setSettings({
        ...settings,
        ...data
      })
    } catch (error) {
      console.error('加载SSH设置失败:', error)
      toast({
        title: "加载SSH设置失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsInitialLoading(false)
    }
  }

  const loadSerialSettings = async () => {
    try {
      const data = await serialSettingsAPI.get()
      console.log('[Settings] Serial settings loaded:', data)
      
      // 更新串口设置状态
      setSerialSettings({
        serialPort: data.serialPort || "",
        serialBaudRate: data.serialBaudRate || "9600"
      })
      
      // 检查是否是自定义波特率
      if (data.serialBaudRate && !commonBaudRates.includes(data.serialBaudRate)) {
        setIsCustomBaudRate(true)
      }
    } catch (error) {
      console.error('加载串口设置失败:', error)
      toast({
        title: "加载串口设置失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    }
  }

  const loadSerialPorts = async () => {
    try {
      const ports = await serialSettingsAPI.getPorts()
      console.log('[Settings] Available serial ports:', ports)
      
      setSerialPorts(ports)
      
      // 如果当前没有选择串口，并且有可用串口，自动选择第一个
      if (!serialSettings.serialPort && ports.length > 0) {
        setSerialSettings(prev => ({
          ...prev,
          serialPort: ports[0].device
        }))
      }
    } catch (error) {
      console.error('加载串口列表失败:', error)
      toast({
        title: "加载串口列表失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
      setSerialPorts([])
    }
  }

  const loadIpSettings = async () => {
    try {
      const data = await systemSettingsAPI.getIpSettings()
      setIpSettings(data)
    } catch (error) {
      console.error('加载IP设置失败:', error)
      toast({
        title: "加载IP设置失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    }
  }

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const projectList = await projectSettingsAPI.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('加载项目列表失败:', error)
      toast({
        title: "加载项目列表失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof SSHSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSerialInputChange = (field: keyof SerialSettings, value: string) => {
    if (field === "serialBaudRate" && value === "custom") {
      setIsCustomBaudRate(true)
      // 保留当前波特率值
      return
    }
    
    setSerialSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCustomBaudRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSerialSettings(prev => ({
      ...prev,
      serialBaudRate: value
    }))
  }

  const handleTestConnection = async () => {
    setIsLoading(true)
    try {
      const { success, message } = await sshSettingsAPI.testConnection(settings)
      toast({
        title: success ? "连接成功" : "连接失败",
        description: message,
        variant: success ? "default" : "destructive"
      })
      setSshConnected(success)
    } catch (error) {
      console.error('测试SSH连接失败:', error)
      toast({
        title: "测试连接失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestSerialConnection = async () => {
    setIsLoading(true)
    try {
      const { success, message } = await serialSettingsAPI.testConnection(serialSettings)
      toast({
        title: success ? "连接成功" : "连接失败",
        description: message,
        variant: success ? "default" : "destructive"
      })
      setSerialConnected(success)
    } catch (error) {
      console.error('测试串口连接失败:', error)
      toast({
        title: "测试连接失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false)
    setIsLoading(true)
    
    try {
      // 使用统一的API保存所有设置
      const result = await unifiedSettingsAPI.saveAllSettings(
        settings,
        {
          serialPort: serialSettings.serialPort,
          serialBaudRate: isCustomBaudRate 
            ? Number(serialSettings.serialBaudRate).toString() 
            : serialSettings.serialBaudRate
        },
        ipSettings
      )
      
      toast({
        title: "保存成功",
        description: "所有设置已更新"
      })
    } catch (error) {
      console.error('保存设置失败:', error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSave = () => {
    setShowConfirmDialog(false)
  }

  const handleSave = async () => {
    try {
      console.log('[Settings] Saving serial settings:', serialSettings)
      
      await serialSettingsAPI.update({
        serialPort: serialSettings.serialPort,
        serialBaudRate: isCustomBaudRate ? Number(serialSettings.serialBaudRate).toString() : serialSettings.serialBaudRate
      })
      
      toast({
        title: "保存成功",
        description: "串口设置已更新"
      })
      
      console.log('[Settings] Serial settings saved successfully')
    } catch (error) {
      console.error('保存串口设置失败:', error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    }
  }

  const checkSerialConnection = async () => {
    try {
      const { success } = await serialSettingsAPI.testConnection(serialSettings)
      setSerialConnected(success)
    } catch {
      setSerialConnected(false)
    }
  }

  const handleDisconnectSerial = async () => {
    setIsLoading(true)
    try {
      const { success, message } = await serialSettingsAPI.disconnect()
      toast({
        title: success ? "串口已断开" : "断开失败",
        description: message,
        variant: success ? "default" : "destructive"
      })
      setSerialConnected(false)
    } catch (error) {
      toast({
        title: "断开失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkSshConnection = async () => {
    try {
      const { success } = await sshSettingsAPI.testConnection(settings)
      setSshConnected(success)
    } catch {
      setSshConnected(false)
    }
  }

  const handleDisconnectSsh = async () => {
    setIsLoading(true)
    try {
      const { success, message } = await sshSettingsAPI.disconnect()
      toast({
        title: success ? "SSH已断开" : "断开失败",
        description: message,
        variant: success ? "default" : "destructive"
      })
      setSshConnected(false)
    } catch (error) {
      toast({
        title: "断开失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleIpSettingChange = (field: string, value: string | boolean | number) => {
    setIpSettings(prev => {
      // 根据字段名确定要更新的对象
      if (field.startsWith('fixed') || field === 'useFixedIp' || field === 'customInput') {
        return {
          ...prev,
          backend: {
            ...prev.backend,
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          frontend: {
            ...prev.frontend,
            [field]: value
          }
        };
      }
    });
  }

  const handleSaveIpSettings = async () => {
    setIsLoading(true)
    try {
      const result = await systemSettingsAPI.updateIpSettings(ipSettings)
      toast({
        title: result.success ? "保存成功" : "保存失败",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      })
    } catch (error) {
      console.error('保存IP设置失败:', error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理创建项目
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "项目名称不能为空",
        variant: "destructive"
      })
      return
    }
    
    // 检查项目名称是否已存在
    const nameExists = projects.some(p => p.name === newProject.name && (!currentProject || p.id !== currentProject.id))
    if (nameExists) {
      toast({
        title: "项目名称已存在",
        description: "请使用其他名称",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const createdProject = await projectSettingsAPI.createProject({
        name: newProject.name,
        description: newProject.description
      })
      
      setProjects(prev => [...prev, createdProject])
      setNewProject({ name: '', description: '' })
      
      toast({
        title: "创建成功",
        description: `项目 "${createdProject.name}" 已成功创建`
      })
      
      // 创建成功后隐藏表单
      setShowCreateForm(false)
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "创建项目时发生未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理编辑项目
  const handleEditProject = (project: Project) => {
    setCurrentProject(project)
    setNewProject({
      name: project.name,
      description: project.description
    })
    setEditingProject(true)
  }

  // 处理取消编辑
  const cancelEdit = () => {
    setEditingProject(false)
    setCurrentProject(null)
    setNewProject({ name: '', description: '' })
    setShowCreateForm(false) // 也隐藏表单
  }

  // 处理保存编辑
  const handleSaveEdit = async () => {
    if (!currentProject) return
    
    if (!newProject.name.trim()) {
      toast({
        title: "项目名称不能为空",
        variant: "destructive"
      })
      return
    }
    
    // 检查修改后的名称是否与其他项目重名
    const nameExists = projects.some(p => p.name === newProject.name && p.id !== currentProject.id)
    if (nameExists) {
      toast({
        title: "项目名称已存在",
        description: "请使用其他名称",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const updatedProject = await projectSettingsAPI.updateProject({
        id: currentProject.id,
        name: newProject.name,
        description: newProject.description
      })
      
      setProjects(prev => 
        prev.map(p => p.id === currentProject.id ? updatedProject : p)
      )
      
      toast({
        title: "更新成功",
        description: `项目 "${updatedProject.name}" 已成功更新`
      })
      
      setEditingProject(false)
      setCurrentProject(null)
      setNewProject({ name: '', description: '' })
      setShowCreateForm(false) // 更新成功后隐藏表单
    } catch (error) {
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新项目时发生未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理删除项目
  const handleDeleteProject = (project: Project) => {
    setCurrentProject(project)
    setShowDeleteProjectDialog(true)
  }

  // 确认删除项目
  const confirmDeleteProject = async () => {
    if (!currentProject) return
    
    setIsLoading(true)
    
    try {
      const result = await projectSettingsAPI.deleteProject(currentProject.id)
      
      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== currentProject.id))
        
        toast({
          title: "删除成功",
          description: `项目 "${currentProject.name}" 已成功删除`
        })
      } else {
        throw new Error(result.message)
      }
      
      setShowDeleteProjectDialog(false)
      setCurrentProject(null)
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除项目时发生未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="ssh">SSH 设置</TabsTrigger>
              <TabsTrigger value="serial">串口设置</TabsTrigger>
              <TabsTrigger value="project">项目设置</TabsTrigger>
              <TabsTrigger value="ip">IP 设置</TabsTrigger>
            </TabsList>

            <TabsContent value="ssh">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-black" />
                    SSH 连接设置
                  </CardTitle>
                  <CardDescription>配置远程测试执行的 SSH 连接详情</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="host">主机</Label>
                      <Input 
                        id="host" 
                        placeholder="example.com 或 192.168.1.1" 
                        value={settings.host}
                        onChange={(e) => handleInputChange("host", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="port">端口</Label>
                      <Input 
                        id="port" 
                        type="number" 
                        placeholder="22" 
                        value={settings.port}
                        onChange={(e) => handleInputChange("port", parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="username" 
                          placeholder="输入用户名" 
                          className="pl-10"
                          value={settings.username}
                          onChange={(e) => handleInputChange("username", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">密码</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="password" 
                          type="password" 
                          placeholder="输入密码" 
                          className="pl-10"
                          value={settings.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleTestConnection}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          测试中...
                        </>
                      ) : (
                        "测试连接"
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectSsh}
                      disabled={!sshConnected || isLoading}
                    >
                      断开连接
                    </Button>
                  </div>
                  <Button 
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={handleSaveClick}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                        保存设置
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="serial">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-black" />
                    串口设置
                  </CardTitle>
                  <CardDescription>配置测试所需的串口连接详情</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="serial-port">串口设备</Label>
                      <Select 
                        value={serialSettings.serialPort} 
                        onValueChange={(value) => handleSerialInputChange("serialPort", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择串口设备" />
                        </SelectTrigger>
                        <SelectContent>
                          {serialPorts.length > 0 ? (
                            serialPorts.map(port => (
                              <SelectItem key={port.device} value={port.device}>
                                {port.device} - {port.description}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>未检测到设备</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="baud-rate">波特率</Label>
                      <div className="flex space-x-2">
                        {!isCustomBaudRate ? (
                          <Select 
                            value={serialSettings.serialBaudRate} 
                            onValueChange={(value) => handleSerialInputChange("serialBaudRate", value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择波特率" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonBaudRates.map(rate => (
                                <SelectItem key={rate} value={rate}>{rate}</SelectItem>
                              ))}
                              <SelectItem value="custom">自定义</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex w-full space-x-2">
                            <Input
                              type="number"
                              placeholder="输入自定义波特率"
                              value={serialSettings.serialBaudRate}
                              onChange={(e) => handleSerialInputChange("serialBaudRate", e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => {
                                setIsCustomBaudRate(false);
                                setSerialSettings(prev => ({
                                  ...prev,
                                  serialBaudRate: "9600"
                                }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      onClick={loadSerialPorts}
                      disabled={isLoading}
                      size="sm"
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      刷新设备列表
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleTestSerialConnection}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          测试中...
                        </>
                      ) : (
                        "测试连接"
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectSerial}
                      disabled={!serialConnected || isLoading}
                    >
                      断开连接
                    </Button>
                  </div>
                  <Button 
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={handleSaveClick}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                        保存设置
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="project">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5 text-black" />
                        项目设置
                      </CardTitle>
                      <CardDescription>管理测试项目，创建、编辑或删除项目</CardDescription>
                    </div>
                    <Button 
                      onClick={() => {
                        if (editingProject) {
                          cancelEdit();
                        }
                        setShowCreateForm(!showCreateForm);
                      }}
                      className={showCreateForm ? "bg-gray-200 hover:bg-gray-300 text-black" : ""}
                    >
                      {showCreateForm ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          取消
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          新增项目
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading && !showCreateForm && !editingProject ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>加载项目...</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {projects.length > 0 ? (
                          <div className="grid gap-4">
                            {projects.map((project) => (
                              <div key={project.id} className="flex items-center justify-between p-4 rounded-md border hover:bg-gray-50">
                                <div>
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-sm text-gray-500">{project.description}</div>
                                  <div className="text-xs text-gray-400 mt-1 space-y-1">
                                    <span>创建时间: {new Date(project.createTime).toLocaleString('zh-CN')}</span>
                                    {project.updateTime && project.updateTime !== project.createTime && (
                                      <span>更新时间: {new Date(project.updateTime).toLocaleString('zh-CN')}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => {
                                      handleEditProject(project);
                                      setShowCreateForm(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => handleDeleteProject(project)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-24 border rounded-md bg-gray-50">
                            <p className="text-muted-foreground">暂无项目，请创建新项目</p>
                          </div>
                        )}
                      </div>

                      {/* 创建/编辑项目表单 - 使用动画 */}
                      <AnimatePresence>
                        {showCreateForm && (
                          <motion.div 
                            className="mt-6 border p-4 rounded-md bg-gray-50"
                            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <h3 className="text-lg font-medium mb-4">
                              {editingProject ? '编辑项目' : '创建新项目'}
                            </h3>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="project-name">项目名称</Label>
                                <Input 
                                  id="project-name" 
                                  placeholder="输入项目名称" 
                                  value={newProject.name}
                                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="project-description">项目描述</Label>
                                <Input 
                                  id="project-description" 
                                  placeholder="输入项目描述（可选）" 
                                  value={newProject.description}
                                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                                />
                              </div>
                              <div className="flex justify-end space-x-2 pt-2">
                                <Button 
                                  variant="outline" 
                                  onClick={cancelEdit}
                                  disabled={isLoading}
                                >
                                  取消
                                </Button>
                                <Button 
                                  onClick={editingProject ? handleSaveEdit : handleCreateProject}
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      {editingProject ? '保存中...' : '创建中...'}
                                    </>
                                  ) : (
                                    <>
                                      <Save className="mr-2 h-4 w-4" />
                                      {editingProject ? '保存修改' : '保存项目'}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ip">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-black" />
                    IP连接设置
                  </CardTitle>
                  <CardDescription>配置后端IP地址</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="use-fixed-ip" 
                        checked={ipSettings.backend.useFixedIp}
                        onCheckedChange={(checked) => handleIpSettingChange("useFixedIp", checked)}
                      />
                      <Label htmlFor="use-fixed-ip">使用固定IP</Label>
                    </div>
                    
                    {ipSettings.backend.useFixedIp ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pl-6">
                        <div className="space-y-2">
                          <Label htmlFor="fixed-host">主机地址</Label>
                          <Input 
                            id="fixed-host" 
                            placeholder="localhost 或 192.168.1.1" 
                            value={ipSettings.backend.fixedHost}
                            onChange={(e) => handleIpSettingChange("fixedHost", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fixed-port">端口</Label>
                          <Input 
                            id="fixed-port" 
                            type="number" 
                            placeholder="5000" 
                            value={ipSettings.backend.fixedPort}
                            onChange={(e) => handleIpSettingChange("fixedPort", parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pl-6 text-gray-600">
                        <p>系统将自动获取当前主机的IP地址，IP地址将设置为：</p>
                        <p className="font-mono bg-gray-100 p-2 rounded mt-2">
                          http://{ipSettings.backend.localIp || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')}:{ipSettings.backend.fixedPort || 5000}
                        </p>
                      </div>
                    )}
                  </div>

                  <Alert className="mt-4 bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>重要提示</AlertTitle>
                    <AlertDescription>
                      修改IP设置后需要刷新页面才能生效。请确保后端服务在指定的地址和端口上运行。
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-end mt-6">
                    <Button 
                      onClick={handleSaveClick}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          保存设置
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存设置</AlertDialogTitle>
            <AlertDialogDescription>
              请确认是否保存所有设置？这将更新SSH连接、串口连接和IP设置.
              <p className="mt-2 text-amber-600">注意：项目设置需要在项目设置页面单独保存。</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDeleteProjectDialog} onOpenChange={setShowDeleteProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目 "{currentProject?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteProjectDialog(false)}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProject}
              className="bg-red-500 hover:bg-red-600"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  )
}

