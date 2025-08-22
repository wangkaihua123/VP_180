"use client"

import { Suspense } from "react"
import { ExecuteAllPage } from "./page-content"

export default function ExecuteAllPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExecuteAllPage />
    </Suspense>
  )
}