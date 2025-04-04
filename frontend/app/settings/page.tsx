"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Save, Server, Key, User, Database, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { sshSettingsAPI } from "@/lib/api"
import type { SSHSettings } from "@/app/api/routes"
import { Toaster } from "@/components/ui/toaster"

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [settings, setSettings] = useState<SSHSettings>({
    host: "",
    port: 22,
    username: "",
    authType: "password",
    password: "",
    privateKeyPath: "",
    passphrase: "",
    remoteDir: ""
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await sshSettingsAPI.get()
      setSettings({
        ...settings,
        ...data,
        authType: data.password ? "password" : "key"
      })
    } catch (error) {
      console.error('加载设置失败:', error)
      toast({
        title: "加载设置失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsInitialLoading(false)
    }
  }

  const handleInputChange = (field: keyof SSHSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
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
      console.error('测试连接失败:', error)
      toast({
        title: "测试连接失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const dataToSave = {
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password: settings.authType === 'password' ? settings.password : undefined,
        privateKeyPath: settings.authType === 'key' ? settings.privateKeyPath : undefined,
        passphrase: settings.authType === 'key' ? settings.passphrase : undefined,
        remoteDir: settings.remoteDir
      }
      
      await sshSettingsAPI.update(dataToSave)
      toast({
        title: "保存成功",
        description: "SSH 设置已更新"
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
            <span>SSH 设置</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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
                <Label htmlFor="auth-type">认证方式</Label>
                <Tabs value={settings.authType} onValueChange={(value) => handleInputChange("authType", value)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="password">密码</TabsTrigger>
                    <TabsTrigger value="key">SSH 密钥</TabsTrigger>
                  </TabsList>

                  <TabsContent value="password" className="space-y-4 pt-4">
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
                  </TabsContent>

                  <TabsContent value="key" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="private-key">私钥路径</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="private-key" 
                          placeholder="/path/to/private_key" 
                          className="pl-10"
                          value={settings.privateKeyPath}
                          onChange={(e) => handleInputChange("privateKeyPath", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passphrase">密码短语（如需）</Label>
                      <Input 
                        id="passphrase" 
                        type="password" 
                        placeholder="输入密码短语"
                        value={settings.passphrase}
                        onChange={(e) => handleInputChange("passphrase", e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remote-dir">远程目录</Label>
                <div className="relative">
                  <Database className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    id="remote-dir" 
                    placeholder="/path/to/test/directory" 
                    className="pl-10"
                    value={settings.remoteDir}
                    onChange={(e) => handleInputChange("remoteDir", e.target.value)}
                  />
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
                onClick={handleSave}
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
        </motion.div>
      </main>
      <Toaster />
    </div>
  )
}

