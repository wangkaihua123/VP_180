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
import { LayoutWrapper } from "@/components/LayoutWrapper"
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
    <html lang="zh-CN" className="overflow-y-scroll">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --removed-body-scroll-bar-size: 0px;
          }
          body {
            overflow-x: hidden;
          }
        `}} />
      </head>
      <body className={inter.className}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Toaster />
      </body>
    </html>
  )
}