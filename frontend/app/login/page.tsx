"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, Lock, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SplashCursor } from "@/components/ui/splash-cursor"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showTransition, setShowTransition] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    if (username === "admin" && password === "admin") {
      // 登录成功动画
      const loginButton = document.getElementById("login-button")
      if (loginButton) {
        loginButton.classList.add("animate-success")
      }

      // 显示过渡动画
      setIsLoggingIn(true)
      setShowTransition(true)

      // 延迟导航以显示完整动画
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } else {
      setError("用户名或密码错误")
      // 抖动动画
      const loginForm = document.getElementById("login-form")
      if (loginForm) {
        loginForm.classList.add("animate-shake")
        setTimeout(() => {
          loginForm.classList.remove("animate-shake")
        }, 500)
      }
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* 流体动画背景 */}
      <SplashCursor
        SPLAT_RADIUS={0.3}
        DENSITY_DISSIPATION={2.5}
        VELOCITY_DISSIPATION={1.8}
        SPLAT_FORCE={8000}
        COLOR_UPDATE_SPEED={15}
        CURL={20}
        TRANSPARENT={true}
      />

      {/* 光晕效果 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gray-500 rounded-full opacity-10 blur-[100px] z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gray-700 rounded-full opacity-10 blur-[80px] z-0" />

      {/* 登录成功过渡动画 */}
      {showTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.5, 0.8],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2.5,
              times: [0, 0.6, 1],
              ease: "easeInOut",
            }}
            className="relative"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 2.5,
                times: [0, 0.6, 1],
              }}
              className="absolute inset-0 bg-white blur-xl rounded-full"
              style={{ width: "120%", height: "120%", top: "-10%", left: "-10%" }}
            />
            <motion.span
              className="text-9xl font-bold text-white"
              animate={{
                textShadow: [
                  "0 0 20px rgba(255,255,255,0.5)",
                  "0 0 60px rgba(255,255,255,0.8)",
                  "0 0 20px rgba(255,255,255,0.5)",
                ],
              }}
              transition={{ duration: 2.5 }}
            >
              优
            </motion.span>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div id="login-form" className="bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-gradient-to-br from-gray-800 to-black rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            >
              <img src="/优亿测试.ico" alt="优亿测试" className="w-full h-full object-contain" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-1"
            >
              <span className="font-bold">优亿医疗</span>
              <span className="font-normal text-white text-sm ml-1">自动化测试平台</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 text-sm"
            >
              请登录以继续访问
            </motion.p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Alert variant="destructive" className="bg-red-500/20 text-white border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <Label htmlFor="username" className="text-white">
                用户名
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/10 border-white/10 text-white pl-10 focus:border-gray-500 focus:ring-gray-500"
                  placeholder="输入用户名"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-white">
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/10 text-white pl-10 focus:border-gray-500 focus:ring-gray-500"
                  placeholder="输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/50 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Button
                id="login-button"
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white py-6 rounded-xl transition-all duration-300 shadow-lg shadow-black/20"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "登录中..." : "登录"}
              </Button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <p className="text-white/50 text-sm">
              提示: 用户名 <span className="text-white">admin</span> 密码 <span className="text-white">admin</span>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

