import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const testCasesPath = path.join(process.cwd(), 'backend/data/test_cases.json')

// 读取测试用例文件
async function readTestCases() {
  try {
    const fileContents = await fs.readFile(testCasesPath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // 如果文件不存在，返回空数组
      return []
    }
    throw error
  }
}

// 写入测试用例文件
async function writeTestCases(testCases: any[]) {
  await fs.writeFile(testCasesPath, JSON.stringify(testCases, null, 2))
}

// 获取测试用例列表
export async function GET() {
  try {
    const testCases = await readTestCases()
    return NextResponse.json(testCases)
  } catch (error) {
    return NextResponse.json(
      { error: '加载测试用例失败' },
      { status: 500 }
    )
  }
}

// 创建新测试用例
export async function POST(request: Request) {
  try {
    const testCases = await readTestCases()
    const newTestCase = await request.json()
    
    // 生成新的ID
    const maxId = testCases.reduce((max: number, tc: any) => Math.max(max, tc.id || 0), 0)
    const newId = maxId + 1
    
    // 添加创建时间和ID
    const testCaseWithMeta = {
      ...newTestCase,
      id: newId,
      create_time: new Date().toISOString().replace('T', ' ').split('.')[0]
    }
    
    // 添加到数组并保存
    testCases.push(testCaseWithMeta)
    await writeTestCases(testCases)
    
    return NextResponse.json(testCaseWithMeta)
  } catch (error) {
    return NextResponse.json(
      { error: '创建测试用例失败' },
      { status: 500 }
    )
  }
} 