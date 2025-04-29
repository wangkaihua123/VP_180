/**
 * 根布局组件
 * 
 * 该组件是整个应用程序的根布局，定义了应用的基本HTML结构。
 * 它包含页面的元数据设置（标题、描述等）、字体设置，并渲染所有页面的共享结构。
 * 所有页面组件都会被渲染在这个布局内的children位置。
 */
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { MainNav } from "@/components/MainNav"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "自动化测试平台",
  description: "现代化自动化测试管理平台",
  generator: 'vp-180.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <MainNav />
        <div className="pt-16">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  )
}