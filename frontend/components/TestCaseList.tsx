/**
 * 测试用例列表组件
 * 
 * 该组件用于显示测试用例列表，并提供以下功能：
 * - 显示测试用例基本信息（名称、类型、状态等）
 * - 支持选择单个或多个测试用例
 * - 提供测试用例的执行、查看日志、编辑、删除等操作
 * - 支持批量执行和批量删除选中的测试用例
 * - 显示测试日志和截图
 */
"use client"

import { TestCase } from "@/app/api/routes"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { testCasesAPI } from "@/lib/api/test-cases"
import { useToast } from "@/components/ui/use-toast"
import { Play, Edit, Trash2, FileText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Image from "next/image"
import { useRouter } from "next/navigation"

// 导入BASE_URL用于图像URL
import { BASE_URL } from "@/lib/api"

interface TestCaseListProps {
  testCases: TestCase[]
  loading: boolean
  selectedIds?: number[]
  onSelectionChange: (ids: number[]) => void
  onRefresh: () => void
  enableSelection?: boolean
}

interface TestCaseLog {
  log_content: string;
  images: string[];
  screenshots: string[];
  timestamp: string;
}

export function TestCaseList({ 
  testCases, 
  loading, 
  selectedIds = [], 
  onSelectionChange = () => {}, 
  onRefresh,
  enableSelection = true
}: TestCaseListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedLog, setSelectedLog] = useState<TestCaseLog | null>(null)
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id)
      await testCasesAPI.delete(id)
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
      setShowDeleteDialog(false)
      setDeleteTargetId(null)
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteTargetId(id)
    setShowDeleteDialog(true)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    
    setShowBatchDeleteDialog(true)
  }
  
  const confirmDeleteSelected = async () => {
    try {
      // 一个个删除选中的测试用例
      for (const id of selectedIds) {
        await testCasesAPI.delete(id)
      }
      
      toast({
        title: "删除成功",
        description: `已删除 ${selectedIds.length} 个测试用例`,
      })
      
      // 清空选择
      onSelectionChange([])
      // 刷新列表
      onRefresh()
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除测试用例失败",
        variant: "destructive",
      })
    } finally {
      setShowBatchDeleteDialog(false)
    }
  }

  const handleRun = async (id: number) => {
    try {
      await testCasesAPI.run(id)
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
      const response = await testCasesAPI.getLatestLog(parseInt(id.toString()))
      setSelectedLog(response.data || null)
      setIsLogDialogOpen(true)
    } catch (error) {
      toast({
        title: "获取日志失败",
        description: error instanceof Error ? error.message : "获取测试用例日志失败",
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? testCases.map(tc => tc.id) : [])
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    onSelectionChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter(selectedId => selectedId !== id)
    )
  }

  const handleExecuteSelected = () => {
    if (selectedIds.length > 0) {
      router.push(`/execute-all?ids=${selectedIds.join(',')}`)
    }
  }

  if (loading) {
    return <div className="text-center py-4">加载中...</div>
  }

  if (!testCases || testCases.length === 0) {
    return <div className="text-center py-4">暂无测试用例</div>
  }

  return (
    <>
      {enableSelection && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedIds.length > 0 && selectedIds.length === testCases.length}
              onCheckedChange={handleSelectAll}
              aria-label="全选"
            />
            <span className="text-sm text-gray-500">
              已选择 {selectedIds.length} 个测试用例
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除选中
            </Button>
            <Button 
              onClick={handleExecuteSelected}
              disabled={selectedIds.length === 0}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Play className="mr-2 h-4 w-4" />
              执行选中
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === testCases.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
              )}
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
              <TableRow key={testCase.id} className={selectedIds.includes(testCase.id) ? "bg-gray-50" : ""}>
                {enableSelection && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(testCase.id)}
                      onCheckedChange={(checked) => handleSelectOne(testCase.id, checked as boolean)}
                      aria-label={`选择测试用例 ${testCase.title}`}
                    />
                  </TableCell>
                )}
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
                      onClick={() => handleDeleteClick(testCase.id)}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个测试用例吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTargetId && handleDelete(deleteTargetId)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 个测试用例吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBatchDeleteDialog(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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