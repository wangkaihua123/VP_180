import Link from 'next/link';
import { Home, Plus, Play, FileText, Settings } from 'lucide-react';

/**
 * 侧边栏组件
 * 
 * 用于页面导航的侧边栏组件，包含以下功能：
 * - 显示系统标志和标题
 * - 提供主要功能的导航链接
 */
export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen px-4 py-6 flex flex-col">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
          <span className="text-gray-900 font-bold text-lg">优</span>
        </div>
        <div className="ml-3">
          <h1 className="font-bold text-lg">优亿医疗</h1>
          <p className="text-xs text-gray-400">自动化测试平台</p>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <Link href="/" className="flex items-center py-2 px-4 rounded hover:bg-gray-800 transition-colors">
              <Home className="mr-3 h-5 w-5" />
              <span>首页</span>
            </Link>
          </li>
          <li>
            <Link href="/test-cases/new" className="flex items-center py-2 px-4 rounded hover:bg-gray-800 transition-colors">
              <Plus className="mr-3 h-5 w-5" />
              <span>新建用例</span>
            </Link>
          </li>
          <li>
            <Link href="/execute-all" className="flex items-center py-2 px-4 rounded hover:bg-gray-800 transition-colors">
              <Play className="mr-3 h-5 w-5" />
              <span>执行测试</span>
            </Link>
          </li>
          <li>
            <Link href="/test-cases/reports" className="flex items-center py-2 px-4 rounded hover:bg-gray-800 transition-colors">
              <FileText className="mr-3 h-5 w-5" />
              <span>测试报告</span>
            </Link>
          </li>
          <li>
            <Link href="/settings" className="flex items-center py-2 px-4 rounded hover:bg-gray-800 transition-colors">
              <Settings className="mr-3 h-5 w-5" />
              <span>系统设置</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <button className="w-full flex items-center py-2 px-4 rounded hover:bg-gray-800 transition-colors">
          <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
} 