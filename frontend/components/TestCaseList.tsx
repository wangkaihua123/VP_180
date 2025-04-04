"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Edit, Trash2, FileText } from "lucide-react"
import { testCaseAPI } from "@/lib/api"
import { formatDateTime } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface TestCaseLog {
  id: string;
  content: string;
  images: string[];
  screenshots: string[];
  createTime: string;
  status: string;
}

interface TestCase {
  id: string;
  title: string;
  type: string;
  status: string;
  createTime: string;
  repeatCount: number;
}

interface TestCaseListProps {
  testCases?: TestCase[];
  loading?: boolean;
  onRefresh: () => void;
}

export function TestCaseList({ testCases = [], loading = false, onRefresh }: TestCaseListProps) {
  const { toast } = useToast()
  const [selectedLog, setSelectedLog] = useState<TestCaseLog | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleRun = async (id: string) => {
    try {
      await testCaseAPI.run(parseInt(id))
      toast({
        title: "执行成功",
        description: "测试用例已开始执行"
      })
      onRefresh()
    } catch (error) {
      toast({
        title: "执行失败",
        description: error instanceof Error ? error.message : "执行测试用例失败",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await testCaseAPI.delete(parseInt(id))
      toast({
        title: "删除成功",
        description: "测试用例已删除"
      })
      onRefresh()
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除测试用例失败",
        variant: "destructive"
      })
    }
  }

  const handleViewLog = async (id: string) => {
    try {
      const log = await testCaseAPI.getLatestLog(parseInt(id))
      setSelectedLog(log)
    } catch (error) {
      toast({
        title: "获取日志失败",
        description: error instanceof Error ? error.message : "获取测试用例日志失败",
        variant: "destructive"
      })
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await handleDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return <div className="text-center py-8">暂无测试用例</div>
  }

  return (
    <>
      <div className="space-y-4">
        {testCases.map((testCase) => (
          <Card key={testCase.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="font-medium">{testCase.title}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Badge variant="outline">{testCase.type}</Badge>
                    <span>·</span>
                    <Badge variant={testCase.status === "通过" ? "success" : testCase.status === "未运行" ? "secondary" : "destructive"}>
                      {testCase.status}
                    </Badge>
                    <span>·</span>
                    <span>重复次数: {testCase.repeatCount || 1}</span>
                    <span>·</span>
                    <span>{formatDateTime(testCase.createTime)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleRun(testCase.id)}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/test-cases/${testCase.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleViewLog(testCase.id)}>
                  <FileText className="h-4 w-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(testCase.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个测试用例吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>测试日志</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="log" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="log">日志内容</TabsTrigger>
              <TabsTrigger value="images">图片</TabsTrigger>
              <TabsTrigger value="screenshots">截图</TabsTrigger>
            </TabsList>
            <TabsContent value="log">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {selectedLog?.content || "暂无日志内容"}
                </pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="images">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog?.images?.map((image, index) => (
                    <div key={index} className="relative aspect-video">
                      <Image
                        src={image}
                        alt={`图片 ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ))}
                </div>
                {(!selectedLog?.images || selectedLog.images.length === 0) && (
                  <div className="text-center py-8">暂无图片</div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="screenshots">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog?.screenshots?.map((screenshot, index) => (
                    <div key={index} className="relative aspect-video">
                      <Image
                        src={screenshot}
                        alt={`截图 ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ))}
                </div>
                {(!selectedLog?.screenshots || selectedLog.screenshots.length === 0) && (
                  <div className="text-center py-8">暂无截图</div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
} 