import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  console.log(`测试动态路由，请求的文件名: ${filename}`);
  
  return NextResponse.json({
    success: true,
    filename: filename,
    message: `动态路由工作正常，文件名: ${filename}`
  });
}
