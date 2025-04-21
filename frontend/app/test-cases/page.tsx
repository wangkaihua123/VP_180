import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { TestCaseList } from "@/components/TestCaseList"
import { testCasesAPI } from "@/lib/api/test-cases"
import { TestCase } from "@/app/api/routes"

export default function TestCasesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const loadTestCases = async () => {
    try {
      setLoading(true)
      const response = await testCasesAPI.list()
      if (response.success) {
        setTestCases(response.data)
      } else {
        toast({
          title: "加载失败",
          description: response.message || "无法加载测试用例",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "加载测试用例时发生错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteSelected = async () => {
    try {
      setLoading(true)
      const idsToRun = selectedIds.length > 0 ? selectedIds : testCases.map(tc => tc.id)
      const response = await testCasesAPI.runBatch(idsToRun)
      if (response.success) {
        toast({
          title: "执行成功",
          description: "测试用例已开始执行",
        })
        router.push("/execute-all")
      } else {
        toast({
          title: "执行失败",
          description: response.message || "无法执行测试用例",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "执行失败",
        description: "执行测试用例时发生错误",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTestCases()
  }, [])

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">测试用例</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadTestCases}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => router.push("/test-cases/new")}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            新建测试用例
          </Button>
          <Button
            onClick={handleExecuteSelected}
            disabled={loading || testCases.length === 0}
          >
            执行选中用例
          </Button>
        </div>
      </div>
      <TestCaseList
        testCases={testCases}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        enableSelection={true}
        onRefresh={loadTestCases}
      />
    </div>
  )
} 