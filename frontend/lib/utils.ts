/**
 * 工具函数模块
 * 
 * 该文件提供了整个应用程序中使用的通用工具函数：
 * - cn: 用于合并Tailwind CSS类名的工具函数，结合了clsx和tailwind-merge的功能
 * - formatDateTime: 用于格式化日期时间字符串的工具函数，采用中文本地化格式
 * 
 * 这些工具函数可在应用的任何部分被导入和使用，提高了代码的可重用性。
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
