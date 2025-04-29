/**
 * 测试用例列表页面
 * 
 * 该页面是应用的主要功能页面，用于展示和管理所有测试用例：
 * - 显示所有测试用例的列表
 * - 提供新建测试用例、执行所有测试用例的功能
 * - 通过顶部导航访问其他功能页面
 * - 使用TestCaseList组件展示测试用例详情
 * - 处理测试用例的加载状态和错误提示
 * - 支持选择和批量操作测试用例
 * - 展示最近一次测试用例执行结果
 * - 支持分页显示测试用例和自定义每页显示数量
 */
"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Play, Home, FilePlus, FileBarChart2, LayoutGrid, Trash2 } from "lucide-react"
import { TestCaseList } from "@/components/TestCaseList"
import { testCasesAPI } from "@/lib/api/test-cases"
import { useEffect, useState, useMemo } from "react"
import { TestCase } from "../api/routes"
import { useToast } from "@/components/ui/use-toast"
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const pageSizeOptions = [10, 20, 50, 100]

  useEffect(() => {
    loadTestCases()
  }, [])

  // 当页面大小改变时，重置当前页码为1
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize])

  useEffect(() => {
    console.log("selectedIds变更:", selectedIds);
  }, [selectedIds]);

  const loadTestCases = async () => {
    try {
      setLoading(true)
      const response = await testCasesAPI.list()
      
      if (response.success) {
        const testCasesData = response.test_cases || [];
        
        // 对测试用例按创建时间或ID进行排序，最新的放在前面
        const sortedTestCases = [...testCasesData].sort((a, b) => {
          // 首先尝试按创建时间降序排序
          if (a.create_time && b.create_time) {
            return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
          }
          // 如果没有创建时间，则按ID降序排序（通常更大的ID表示更新的记录）
          return b.id - a.id;
        });
        
        // 直接使用排序后的测试用例数据
        console.log("测试用例数据（已排序）:", sortedTestCases);
        setTestCases(sortedTestCases);
      } else {
        toast({
          title: "加载失败",
          description: response.message || "无法加载测试用例",
          variant: "destructive",
        })
        setTestCases([])
      }
    } catch (error) {
      console.error("加载测试用例失败:", error)
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "加载测试用例失败",
        variant: "destructive",
      })
      setTestCases([])
    } finally {
      setLoading(false)
    }
  }

  const handleRunAll = async () => {
    // 跳转到执行页面并设置自动执行参数
    console.log("点击了全部执行按钮，准备跳转到执行页面");
    
    if (testCases && testCases.length > 0) {
      // 如果有选中的测试用例，则只执行选中的测试用例
      if (selectedIds && selectedIds.length > 0) {
        console.log("执行选中的测试用例:", selectedIds);
        router.push(`/execute-all?autoExecute=true&ids=${selectedIds.join(',')}`);
      } else {
        // 没有选中的测试用例，执行所有测试用例
        console.log("执行所有测试用例");
        
        // 构建所有测试用例的ID列表
        const allIds = testCases.map(testCase => testCase.id);
        console.log("所有测试用例ID:", allIds);
        
        router.push(`/execute-all?autoExecute=true&ids=${allIds.join(',')}`);
      }
    } else {
      // 没有测试用例时显示提示
      toast({
        title: "无法执行",
        description: "没有可执行的测试用例",
        variant: "destructive",
      });
    }
  }

  // 计算总页数
  const totalPages = useMemo(() => {
    return Math.ceil(testCases.length / pageSize)
  }, [testCases, pageSize])

  // 获取当前页的测试用例
  const currentPageTestCases = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return testCases.slice(startIndex, endIndex)
  }, [testCases, currentPage, pageSize])

  // 处理选中的测试用例ID
  const handleSelectionChange = (ids: number[]) => {
    console.log("测试用例选择变更:", ids);
    // 确保状态更新
    setSelectedIds([...ids]);
  }

  // 处理全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    console.log("全选当前页:", checked);
    if (checked) {
      // 获取当前页的所有测试用例ID
      const currentPageIds = currentPageTestCases.map(tc => tc.id);
      console.log("当前页测试用例IDs:", currentPageIds);
      // 合并当前选中的ID（不在当前页面上的）和当前页面的所有ID
      const nonCurrentPageSelectedIds = selectedIds.filter(id => 
        !currentPageTestCases.some(tc => tc.id === id)
      );
      const newSelectedIds = [...nonCurrentPageSelectedIds, ...currentPageIds];
      console.log("新的选中IDs:", newSelectedIds);
      setSelectedIds(newSelectedIds);
    } else {
      // 取消选中当前页的所有测试用例ID
      const currentPageIds = currentPageTestCases.map(tc => tc.id);
      const newSelectedIds = selectedIds.filter(id => !currentPageIds.includes(id));
      console.log("取消选中后的IDs:", newSelectedIds);
      setSelectedIds(newSelectedIds);
    }
  }

  // 检查当前页是否全选
  const isCurrentPageAllSelected = useMemo(() => {
    return currentPageTestCases.every(tc => selectedIds.includes(tc.id))
  }, [currentPageTestCases, selectedIds])

  // 生成分页号码
  const generatePaginationItems = () => {
    const items = []
    const maxPagesToShow = 5 // 最多显示的页码数量
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
    
    // 调整起始页，确保末尾页不超出范围
    if (endPage - startPage + 1 < maxPagesToShow && startPage > 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }
    
    // 添加第一页
    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      )
      
      // 添加省略号
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-1">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }
    }
    
    // 添加中间页码
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={i === currentPage}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }
    
    // 添加最后一页
    if (endPage < totalPages) {
      // 添加省略号
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-2">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }
      
      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }
    
    return items
  }

  // 统计已选中的测试用例数量
  const selectedCount = useMemo(() => {
    return selectedIds.length
  }, [selectedIds])

  // 处理执行选中的测试用例
  const handleExecuteSelected = () => {
    if (selectedIds.length > 0) {
      router.push(`/execute-all?autoExecute=true&ids=${selectedIds.join(',')}`)
    }
  }

  // 处理删除选中的测试用例
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    
    // 打开确认对话框，这里需要实现
    setShowBatchDeleteDialog(true)
  }
  
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  
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
      setSelectedIds([])
      // 刷新列表
      loadTestCases()
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

  // 批量操作工具栏的显示控制
  const hasSelectedItems = selectedIds.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">测试用例列表</h2>
          <div className="flex space-x-2">
            <Button variant="outline" className="group" onClick={handleRunAll}>
              <Play className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
              全部执行
            </Button>
            <Link href="/test-cases/new">
              <Button className="group bg-black text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4 [&:hover]:text-inherit" />
                新建用例
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
          {!loading && (!testCases || testCases.length === 0) ? (
            <div className="text-center py-4">暂无测试用例</div>
          ) : (
            <>
              {/* 批量操作工具栏 - 放在测试用例列表上方 */}
              <div className="mb-4 bg-gray-50 rounded-md">
                <AnimatePresence>
                  {hasSelectedItems ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-between items-center px-4 py-3"
                    >
                      <div className="flex items-center">
                        <Checkbox 
                          id="select-all"
                          checked={isCurrentPageAllSelected}
                          onCheckedChange={handleSelectAllCurrentPage}
                          aria-label="全选"
                          className="mr-2 border-gray-300"
                        />
                        <span className="text-sm">已选择 {selectedIds.length} 项</span>
                      </div>
                      <div className="flex items-center">
                        <Button 
                          onClick={handleExecuteSelected}
                          disabled={selectedIds.length === 0}
                          className="bg-black text-white hover:bg-gray-800 h-8 px-2 ml-2 rounded flex items-center"
                          size="sm"
                        >
                          <Play className="mr-1 h-4 w-4" />
                          批量执行
                        </Button>
                        <Button 
                          onClick={handleDeleteSelected}
                          disabled={selectedIds.length === 0}
                          variant="outline"
                          className="h-8 px-2 ml-2 rounded flex items-center"
                          size="sm"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          批量删除
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm text-gray-500 px-4 py-3"
                    >
                      请选择测试用例以执行批量操作
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <TestCaseList 
                testCases={currentPageTestCases}
                loading={loading}
                onRefresh={loadTestCases}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                enableSelection={true}
                isAllSelected={isCurrentPageAllSelected}
                onSelectAll={handleSelectAllCurrentPage}
                showSelectionInfo={false}
              />
              
              {/* 分页控件 */}
              {testCases.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-4 pt-4 border-t gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">每页显示:</span>
                    <Select 
                      value={pageSize.toString()} 
                      onValueChange={(value) => setPageSize(Number(value))}
                    >
                      <SelectTrigger className="w-[80px] h-8">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {pageSizeOptions.map(option => (
                            <SelectItem key={option} value={option.toString()}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      显示 {testCases.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
                      {Math.min(currentPage * pageSize, testCases.length)} 
                      共 {testCases.length} 条
                    </span>
                  </div>
                  
                  <Pagination className="self-center md:self-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {generatePaginationItems()}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
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
    </div>
  )
} 