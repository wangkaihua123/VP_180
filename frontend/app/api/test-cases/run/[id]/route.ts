import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const testCasesPath = path.join(process.cwd(), 'backend/data/test_cases.json');

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

// 运行测试用例
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
        { error: '测试用例不存在' },
        { status: 404 }
      );
    }

    // 模拟测试运行过程
    // 在实际应用中，这里可能会调用外部测试执行引擎或服务
    const result = await runTestCase(testCase);
    
    // 更新测试用例的执行状态和时间
    testCase.status = result.success ? '成功' : '失败';
    testCase.last_execution_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // 保存更新后的测试用例
    await writeTestCases(testCases);
    
    return NextResponse.json({ 
      success: true, 
      message: `测试用例 ${id} 已执行`,
      result
    });
  } catch (error) {
    console.error('运行测试用例失败:', error);
    return NextResponse.json(
      { error: '运行测试用例失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 模拟测试用例执行函数
async function runTestCase(testCase: any) {
  // 解析测试脚本内容
  const scriptContent = JSON.parse(testCase.script_content);
  
  // 记录执行步骤结果
  const stepResults = [];
  
  // 执行操作步骤
  for (const step of scriptContent.operationSteps) {
    try {
      // 模拟步骤执行，根据operation_key执行不同操作
      const stepResult = await simulateOperation(step);
      stepResults.push({
        step_id: step.id,
        operation: step.operation_key,
        success: stepResult.success,
        message: stepResult.message,
        screenshot: stepResult.screenshot
      });
    } catch (error) {
      stepResults.push({
        step_id: step.id,
        operation: step.operation_key,
        success: false,
        message: (error as Error).message
      });
    }
  }
  
  // 执行验证步骤
  const verificationResults = [];
  for (const step of scriptContent.verificationSteps) {
    try {
      const verificationResult = await verifyOperation(step, scriptContent.operationSteps);
      verificationResults.push({
        step_id: step.id,
        verification: step.verification_key,
        success: verificationResult.success,
        message: verificationResult.message
      });
    } catch (error) {
      verificationResults.push({
        step_id: step.id,
        verification: step.verification_key,
        success: false,
        message: (error as Error).message
      });
    }
  }
  
  // 判断整体测试是否成功（所有步骤都成功）
  const allStepsSuccessful = stepResults.every(step => step.success);
  const allVerificationsSuccessful = verificationResults.every(v => v.success);
  const success = allStepsSuccessful && allVerificationsSuccessful;
  
  return {
    success,
    operation_results: stepResults,
    verification_results: verificationResults,
    execution_time: new Date().toISOString()
  };
}

// 模拟执行单个操作
async function simulateOperation(step: any) {
  // 根据不同的操作类型执行不同的逻辑
  switch (step.operation_key) {
    case '获取图像':
      // 模拟获取图像操作
      return {
        success: true,
        message: '成功获取图像',
        screenshot: `screenshot_${Date.now()}.png`
      };
      
    case '点击按钮':
      // 模拟点击按钮操作
      return {
        success: true,
        message: `成功点击按钮: ${step.button_name}`,
        screenshot: null
      };
      
    default:
      throw new Error(`不支持的操作类型: ${step.operation_key}`);
  }
}

// 模拟验证操作
async function verifyOperation(verificationStep: any, operationSteps: any[]) {
  switch (verificationStep.verification_key) {
    case '对比图像相似度':
      // 模拟图像相似度比较
      // 在实际应用中，这里可能会调用计算机视觉库来比较两个图像
      const img1 = verificationStep.img1;
      const img2 = verificationStep.img2;
      
      // 随机决定验证结果，实际应用中应使用真正的图像比较算法
      const similarityScore = Math.random();
      const success = similarityScore > 0.7;
      
      return {
        success,
        message: success 
          ? `图像相似度: ${(similarityScore * 100).toFixed(2)}%, 验证通过` 
          : `图像相似度: ${(similarityScore * 100).toFixed(2)}%, 验证失败`
      };
      
    default:
      throw new Error(`不支持的验证类型: ${verificationStep.verification_key}`);
  }
} 