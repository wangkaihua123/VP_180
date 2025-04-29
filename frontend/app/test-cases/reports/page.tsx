"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileDown, Share2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from 'next/link'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

// 模拟测试报告数据
const testReportData = {
  project: 'VP-180项目',
  date: '2025年4月15日',
  passRate: 92,
  totalCases: 248,
  passedCases: 228,
  failedCases: 20,
  compareLastTime: {
    total: '+12',
    passed: '+20',
    failed: '-8'
  },
  modulesPerformance: [
    { name: '用户体验', passRate: 98, passed: 49, failed: 1 },
    { name: '智能搜索', passRate: 95, passed: 38, failed: 2 },
    { name: '订单引擎', passRate: 85, passed: 51, failed: 9 },
    { name: '支付生态', passRate: 94, passed: 30, failed: 2 },
    { name: '用户反馈', passRate: 92, passed: 35, failed: 3 },
    { name: '智能库存', passRate: 83, passed: 25, failed: 5 }
  ],
  failedTestCases: [
    { id: 'TC-001', type: '订单处理', name: '大订单并发处理', errorMsg: '超时异常, 响应时间 > 3000ms', status: '失败' },
    { id: 'TC-002', type: '库存管理', name: '库存更新事务', errorMsg: '断言错误: 预期结果不匹配', status: '失败' },
    { id: 'TC-003', type: '订单处理', name: '促销订单折扣计算', errorMsg: '数据验证失败: 折扣金额计算错误', status: '失败' },
    { id: 'TC-004', type: '支付系统', name: '国际支付渠道接入', errorMsg: '外部API连接失败', status: '失败' },
    { id: 'TC-005', type: '用户管理', name: '用户权限验证', errorMsg: '安全验证未通过: 权限检查不完整', status: '失败' }
  ],
  environment: {
    testEnv: 'UAT 环境',
    server: '16 CPU, 64GB RAM',
    database: 'MySQL 8.0.28',
    apiVersion: 'v2.3.5'
  },
  generatedTime: '2023-12-15 18:30:45',
  team: '优雅优化小组'
}

// 环境信息组件
function EnvironmentInfo({ info }: { info: typeof testReportData.environment }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="3" y2="21"/><line x1="15" x2="15" y1="3" y2="21"/></svg>
            <div>
              <div className="text-sm font-medium">测试环境</div>
              <div className="text-xs text-muted-foreground">{info.testEnv}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
            <div>
              <div className="text-sm font-medium">服务器配置</div>
              <div className="text-xs text-muted-foreground">{info.server}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
            <div>
              <div className="text-sm font-medium">数据库版本</div>
              <div className="text-xs text-muted-foreground">{info.database}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="8" x2="8" y1="20" y2="20"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="12" x2="12" y1="22" y2="22"/><line x1="16" x2="16" y1="16" y2="16"/><line x1="16" x2="16" y1="20" y2="20"/></svg>
            <div>
              <div className="text-sm font-medium">API 版本</div>
              <div className="text-xs text-muted-foreground">{info.apiVersion}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 测试报告组件
export default function TestReportsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* 通过率提示 */}
      <div className="mb-6 flex justify-end">
        <div className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium flex items-center">
          <span className="mr-2">通过率</span> 
          <svg className="h-4 w-4 text-amber-500 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17l-5.878 3.59 1.598-6.7-5.23-4.48 6.865-.55L12 2.5l2.645 6.36 6.866.55-5.231 4.48 1.598 6.7z"/></svg>
          <span className="text-green-600">{testReportData.passRate}%</span>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">测试报告 2.0</h1>
          <div className="text-sm text-muted-foreground">
            <span>项目: {testReportData.project}</span>
            <span className="mx-2">•</span>
            <span>日期: {testReportData.date}</span>
          </div>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>导出数据</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Share2 className="h-4 w-4" />
            <span>快速分享</span>
          </Button>
        </div>
      </div>

      {/* 数据概览区域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">测试用例总量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{testReportData.totalCases}</div>
            <div className="text-sm text-green-500">较上次 {testReportData.compareLastTime.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">成功用例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{testReportData.passedCases}</div>
            <div className="text-sm">通过率 {testReportData.passRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">失败用例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{testReportData.failedCases}</div>
            <div className="text-sm text-red-500">较上次 {testReportData.compareLastTime.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 测试收效图表 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>测试收效果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center text-muted-foreground text-sm">
              这里是测试效果趋势图表
              <div className="h-[150px] w-full bg-gradient-to-r from-green-100 to-green-500 mt-4 rounded relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200"></div>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-200"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近测试报告表现 */}
      <h2 className="text-xl font-bold mb-6">最近测试报告表现</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {testReportData.modulesPerformance.map((module, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-medium">{module.name}</CardTitle>
                <Badge variant={module.passRate >= 95 ? "default" : module.passRate >= 90 ? "outline" : "destructive"}>
                  {module.passRate}% 通过
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={module.passRate} className="h-2 mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>通过: {module.passed}</span>
                <span>失败: {module.failed}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 待解决问题追踪 */}
      <h2 className="text-xl font-bold mb-6">待解决问题追踪</h2>
      <Card className="mb-8">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">用例ID</TableHead>
                <TableHead className="w-[150px]">用例类型</TableHead>
                <TableHead>用例名称</TableHead>
                <TableHead>错误信息</TableHead>
                <TableHead className="text-right">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testReportData.failedTestCases.map((testCase) => (
                <TableRow key={testCase.id}>
                  <TableCell className="font-medium">{testCase.id}</TableCell>
                  <TableCell>{testCase.type}</TableCell>
                  <TableCell>{testCase.name}</TableCell>
                  <TableCell>{testCase.errorMsg}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">{testCase.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      <div className="flex justify-center mb-8">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* 测试环境信息 */}
      <h2 className="text-xl font-bold mb-4">测试环境信息</h2>
      <EnvironmentInfo info={testReportData.environment} />

      {/* 生成时间和团队信息 */}
      <div className="text-sm text-muted-foreground mt-8 pb-4 flex flex-col md:flex-row md:justify-between">
        <div>生成时间: {testReportData.generatedTime}</div>
        <div>测试团队: {testReportData.team}</div>
      </div>

      {/* 分享和打印按钮 */}
      <div className="flex justify-end space-x-2 mb-8">
        <Button variant="outline" className="gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
          <span>分享报告</span>
        </Button>
        <Button variant="outline" className="gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          <span>打印报告</span>
        </Button>
      </div>
    </div>
  )
} 