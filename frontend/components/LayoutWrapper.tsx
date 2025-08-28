"use client"

import { usePathname } from "next/navigation"
import { MainNav } from "@/components/MainNav"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <>
      {!isLoginPage && <MainNav />}
      <div className={isLoginPage ? "" : "pt-16"}>
        {children}
      </div>
    </>
  )
}