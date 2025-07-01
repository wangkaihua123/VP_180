import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API路由工作正常',
    timestamp: new Date().toISOString()
  });
}
