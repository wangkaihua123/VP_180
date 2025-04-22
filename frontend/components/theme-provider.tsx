/**
 * 主题提供者组件
 * 
 * 该组件是对next-themes库的ThemeProvider的包装，用于为整个应用程序提供主题支持。
 * 它允许应用程序支持浅色/深色主题切换，并在浏览器刷新后保持主题选择。
 */
'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
