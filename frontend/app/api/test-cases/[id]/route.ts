import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const testCasesPath = path.join(process.cwd(), 'data/test_cases.json')

// 读取测试用例文件
async function readTestCases() {
  try {
    const fileContents = await fs.readFile(testCasesPath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

// 写入测试用例文件
async function writeTestCases(testCases: any[]) {
  await fs.writeFile(testCasesPath, JSON.stringify(testCases, null, 2))
}

// 获取单个测试用例
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testCases = await readTestCases()
    const testCase = testCases.find((tc: any) => tc.id === parseInt(params.id))
    
    if (!testCase) {
      return NextResponse.json(
        { error: '测试用例不存在' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(testCase)
  } catch (error) {
    return NextResponse.json(
      { error: '获取测试用例失败' },
      { status: 500 }
    )
  }
}

// 更新测试用例
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testCases = await readTestCases()
    const updateData = await request.json()
    const index = testCases.findIndex((tc: any) => tc.id === parseInt(params.id))
    
    if (index === -1) {
      return NextResponse.json(
        { error: '测试用例不存在' },
        { status: 404 }
      )
    }
    
    // 更新测试用例，保留原有的 id 和创建时间
    testCases[index] = {
      ...testCases[index],
      ...updateData,
      id: parseInt(params.id),
      create_time: testCases[index].create_time
    }
    
    await writeTestCases(testCases)
    return NextResponse.json(testCases[index])
  } catch (error) {
    return NextResponse.json(
      { error: '更新测试用例失败' },
      { status: 500 }
    )
  }
}

// 删除测试用例
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testCases = await readTestCases()
    const filteredTestCases = testCases.filter((tc: any) => tc.id !== parseInt(params.id))
    
    if (filteredTestCases.length === testCases.length) {
      return NextResponse.json(
        { error: '测试用例不存在' },
        { status: 404 }
      )
    }
    
    await writeTestCases(filteredTestCases)
    return NextResponse.json({ message: '测试用例已删除' })
  } catch (error) {
    return NextResponse.json(
      { error: '删除测试用例失败' },
      { status: 500 }
    )
  }
} 