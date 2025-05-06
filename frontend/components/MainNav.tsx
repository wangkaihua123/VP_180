"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Home, FileText, Play, Settings, BarChart2, PlusCircle, Menu, X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  description?: string
  matchPaths?: string[] // 匹配的路径列表
}

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 防止水合不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems: NavItem[] = [
    {
      title: "首页",
      href: "/",
      icon: <Home className="h-5 w-5" />,
      description: "测试用例概览",
      matchPaths: ["/", "/test-cases"], // 匹配首页和测试用例列表页
    },
    {
      title: "新建用例",
      href: "/test-cases/new",
      icon: <PlusCircle className="h-5 w-5" />,
      description: "创建新的测试用例",
    },
    {
      title: "执行测试",
      href: "/execute-all",
      icon: <Play className="h-5 w-5" />,
      description: "执行所有测试用例",
    },
    {
      title: "测试报告",
      href: "/test-cases/reports",
      icon: <FileText className="h-5 w-5" />,
      description: "查看测试报告",
    },
    {
      title: "设置",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      description: "系统设置",
    },
  ]

  // 检查当前路径是否匹配导航项
  const isNavItemActive = (item: NavItem) => {
    if (!pathname) return false;
    
    if (item.matchPaths && item.matchPaths.length > 0) {
      return item.matchPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
    }
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      // 从报错信息看，我们需要修改API端点，使用正确的后端地址
      // 获取当前域名下的API路径
      const backendUrl = window.location.origin;
      const response = await fetch(`${backendUrl}/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // 无论成功与否，都直接跳转到登录页面
      router.push('/login');
      
      if (response.ok) {
        // 显示退出成功提示
        toast({
          title: "退出成功",
          description: "您已成功退出系统",
        });
      } else {
        // 即使后端响应失败，也认为用户已退出
        console.warn("退出登录API返回非成功状态码:", response.status);
        toast({
          title: "已退出系统",
          description: "您已成功退出系统",
        });
      }
    } catch (error) {
      console.error("退出登录时发生错误:", error);
      // 即使发生错误，也让用户退出到登录页
      router.push('/login');
      toast({
        title: "已退出系统",
        description: "退出过程中发生错误，但您已被重定向到登录页面",
      });
    }
  };

  if (!mounted) return null

  return (
    <>
      {/* 桌面导航 */}
      <div className="hidden md:flex h-16 items-center px-4 border-b bg-white dark:bg-gray-950 fixed top-0 left-0 right-0 z-30">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <span className="text-white font-bold">优</span>
              </div>
              <span className="font-bold text-lg">优亿医疗</span>
              <span className="text-sm text-muted-foreground">自动化测试平台</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "text-black dark:text-white"
                      : "text-muted-foreground hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800",
                  )}
                >
                  <div className="flex items-center space-x-1">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
                      layoutId="navbar-indicator"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </div>

      {/* 移动导航 */}
      <div className="md:hidden flex h-16 items-center px-4 border-b bg-white dark:bg-gray-950 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
              <span className="text-white font-bold">优</span>
            </div>
            <span className="font-bold text-lg">优亿医疗</span>
          </Link>

          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 移动菜单 */}
      <div
        className={cn("fixed inset-0 z-50 bg-white dark:bg-gray-950 md:hidden", isMobileMenuOpen ? "block" : "hidden")}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <span className="text-white font-bold">优</span>
              </div>
              <span className="font-bold text-lg">优亿医疗</span>
              <span className="text-sm text-muted-foreground">自动化测试平台</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto py-4 px-6">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-4 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                        : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-900",
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn("p-2 rounded-md", isActive ? "bg-black text-white" : "bg-gray-100 text-gray-500")}
                      >
                        {item.icon}
                      </div>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}