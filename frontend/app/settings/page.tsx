"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Save, Server, Key, User, Loader2, Laptop, Activity, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { sshSettingsAPI, serialSettingsAPI } from "@/lib/api"
import type { SSHSettings, SerialPort, SerialSettings } from "@/app/api/routes"
import { Toaster } from "@/components/ui/toaster"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("ssh")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isCustomBaudRate, setIsCustomBaudRate] = useState(false)
  
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

  useEffect(() => {
    loadSettings()
    loadSerialSettings()
    loadSerialPorts()
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
      // 保存SSH设置
      await sshSettingsAPI.update(settings)
      
      // 保存串口设置，转换为正确的格式
      const serialData = {
        serialPort: serialSettings.serialPort,
        serialBaudRate: serialSettings.serialBaudRate
      }
      await serialSettingsAPI.update(serialData)
      
      toast({
        title: "保存成功",
        description: "SSH和串口设置已更新"
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
            <span>设置</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="ssh">SSH 设置</TabsTrigger>
              <TabsTrigger value="serial">串口设置</TabsTrigger>
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
          </Tabs>
        </motion.div>
      </main>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存设置</AlertDialogTitle>
            <AlertDialogDescription>
              请注意：自动化测试用例需要同时连接SSH和串口才能正常运行。确认保存这些设置吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  )
}

