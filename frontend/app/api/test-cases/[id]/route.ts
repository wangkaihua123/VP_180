import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const testCasesPath = path.join(process.cwd(), 'data/test_cases.json');

// 读取测试用例文件
async function readTestCases() {
  try {
    const fileContents = await fs.readFile(testCasesPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // 如果文件不存在，返回空数组
      return [];
    }
    throw error;
  }
}

// 写入测试用例文件
async function writeTestCases(testCases: any[]) {
  await fs.writeFile(testCasesPath, JSON.stringify(testCases, null, 2));
}

// 获取单个测试用例
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testCases = await readTestCases();
    const id = parseInt(params.id);
    
    // 查找对应ID的测试用例
    const testCase = testCases.find((tc: any) => tc.id === id);
    
    if (!testCase) {
      return NextResponse.json(
        { success: false, message: '测试用例不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      test_case: testCase
    });
  } catch (error) {
    console.error('获取测试用例失败:', error);
    return NextResponse.json(
      { success: false, message: '获取测试用例失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 更新测试用例
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testCases = await readTestCases();
    const id = parseInt(params.id);
    const updatedData = await request.json();
    
    // 查找对应ID的测试用例索引
    const index = testCases.findIndex((tc: any) => tc.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { success: false, message: '测试用例不存在' },
        { status: 404 }
      );
    }

    // 更新测试用例，保留原始ID
    const updatedTestCase = {
      ...testCases[index],
      ...updatedData,
      id // 确保ID不变
    };
    
    testCases[index] = updatedTestCase;
    
    // 保存更新后的测试用例列表
    await writeTestCases(testCases);
    
    return NextResponse.json({ 
      success: true,
      message: '测试用例已更新',
      test_case: updatedTestCase
    });
  } catch (error) {
    console.error('更新测试用例失败:', error);
    return NextResponse.json(
      { success: false, message: '更新测试用例失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 删除测试用例
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testCases = await readTestCases();
    const id = parseInt(params.id);
    
    // 查找并过滤掉对应ID的测试用例
    const filteredTestCases = testCases.filter((tc: any) => tc.id !== id);
    
    if (filteredTestCases.length === testCases.length) {
      return NextResponse.json(
        { success: false, message: '测试用例不存在' },
        { status: 404 }
      );
    }
    
    // 保存更新后的测试用例列表
    await writeTestCases(filteredTestCases);
    
    return NextResponse.json({ 
      success: true,
      message: '测试用例已删除'
    });
  } catch (error) {
    console.error('删除测试用例失败:', error);
    return NextResponse.json(
      { success: false, message: '删除测试用例失败', error: (error as Error).message },
      { status: 500 }
    );
  }
} 