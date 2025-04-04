"use client"

import { TestCase } from "@/app/api/routes"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { testCaseAPI, BASE_URL } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Play, Edit, Trash2, FileText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

interface TestCaseListProps {
  testCases: TestCase[]
  loading: boolean
  onRefresh: () => void
}

interface TestCaseLog {
  log_content: string;
  images: string[];
  screenshots: string[];
  timestamp: string;
}

export function TestCaseList({ testCases, loading, onRefresh }: TestCaseListProps) {
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedLog, setSelectedLog] = useState<TestCaseLog | null>(null)
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id)
      await testCaseAPI.delete(id)
      toast({
        title: "删除成功",
        description: "测试用例已删除",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除测试用例失败",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleRun = async (id: number) => {
    try {
      await testCaseAPI.run(id)
      toast({
        title: "执行成功",
        description: "测试用例已开始执行",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: "执行失败",
        description: error instanceof Error ? error.message : "执行测试用例失败",
        variant: "destructive",
      })
    }
  }

  const handleViewLog = async (id: number) => {
    try {
      const log = await testCaseAPI.getLatestLog(parseInt(id.toString()))
      setSelectedLog(log)
      setIsLogDialogOpen(true)
    } catch (error) {
      toast({
        title: "获取日志失败",
        description: error instanceof Error ? error.message : "获取测试用例日志失败",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="text-center py-4">加载中...</div>
  }

  if (testCases.length === 0) {
    return <div className="text-center py-4">暂无测试用例</div>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>重复次数</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testCases.map((testCase) => (
              <TableRow key={testCase.id}>
                <TableCell className="font-medium">
                  <Link href={`/test-cases/${testCase.id}`} className="hover:underline">
                    {testCase.title}
                  </Link>
                </TableCell>
                <TableCell>{testCase.type}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      testCase.status === "通过"
                        ? "success"
                        : testCase.status === "失败"
                          ? "destructive"
                          : testCase.status === "警告"
                            ? "warning"
                            : "outline"
                    }
                  >
                    {testCase.status}
                  </Badge>
                </TableCell>
                <TableCell>{JSON.parse(testCase.script_content).repeatCount || 1}</TableCell>
                <TableCell>{testCase.create_time}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRun(testCase.id)}
                    >
                      <Play className="h-4 w-4 [&:hover]:text-inherit" />
                      <span className="sr-only">运行</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-500"
                      onClick={() => handleViewLog(testCase.id)}
                    >
                      <FileText className="h-4 w-4 [&:hover]:text-inherit" />
                      <span className="sr-only">查看日志</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <Link href={`/test-cases/${testCase.id}/edit`}>
                        <Edit className="h-4 w-4 [&:hover]:text-inherit" />
                        <span className="sr-only">编辑</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(testCase.id)}
                      disabled={deletingId === testCase.id}
                    >
                      <Trash2 className="h-4 w-4 [&:hover]:text-inherit" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>测试日志</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="log" className="w-full">
            <TabsList>
              <TabsTrigger value="log">日志内容</TabsTrigger>
              <TabsTrigger value="images">图像</TabsTrigger>
              <TabsTrigger value="screenshots">截图</TabsTrigger>
            </TabsList>
            <TabsContent value="log" className="mt-4">
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                {selectedLog?.log_content || "暂无日志"}
              </pre>
            </TabsContent>
            <TabsContent value="images" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedLog?.images?.map((image, index) => (
                  <div key={index} className="relative aspect-video">
                    <Image
                      src={`${BASE_URL}${image}`}
                      alt={`测试图像 ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                )) || <div>暂无图像</div>}
              </div>
            </TabsContent>
            <TabsContent value="screenshots" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedLog?.screenshots?.map((screenshot, index) => (
                  <div key={index} className="relative aspect-video">
                    <Image
                      src={`${BASE_URL}${screenshot}`}
                      alt={`测试截图 ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                )) || <div>暂无截图</div>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

