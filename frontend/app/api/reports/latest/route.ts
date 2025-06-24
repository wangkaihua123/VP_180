import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// 获取项目根目录（frontend的上一级目录）
function getRootDir() {
  // 从当前文件位置（frontend/app/api/reports/latest/route.ts）向上4级到达项目根目录
  return path.resolve(process.cwd(), '..');
}

/**
 * 获取最新的测试报告数据
 * @returns 包含测试报告数据的JSON响应
 */
export async function GET() {
  try {
    // 使用自定义函数获取项目根目录
    const BASE_DIR = getRootDir()
    const dataDir = path.join(BASE_DIR, 'data')
    const reportPath = path.join(dataDir, 'report.json')
    
    console.log('项目根目录:', BASE_DIR)
    console.log('数据目录:', dataDir)
    console.log('报告文件路径:', reportPath)
    
    // 检查报告文件是否存在
    if (!fs.existsSync(reportPath)) {
      return NextResponse.json({
        success: false,
        message: '测试报告文件不存在',
      }, { status: 404 })
    }
    
    // 读取报告数据
    const reportData = fs.readFileSync(reportPath, 'utf-8')
    
    // 解析JSON数据
    const report = JSON.parse(reportData)
    
    // 返回成功响应和报告数据
    return NextResponse.json({
      success: true,
      message: '成功获取测试报告数据',
      data: report
    })
  } catch (error) {
    console.error('获取测试报告失败:', error)
    
    // 返回错误响应
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取测试报告时发生未知错误'
    }, { status: 500 })
  }
} 