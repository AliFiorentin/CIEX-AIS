"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export function RouteModal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const close = () => router.back()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-6"
      style={{
        backgroundColor: "rgba(9,26,31,0.6)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="animate-scale-in relative w-full max-w-[1440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          onClick={close}
          aria-label="Fechar"
          title="Fechar (Esc)"
          className="active-press absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-slate-100"
          style={{ color: "#1E404A" }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        {children}
      </div>
    </div>
  )
}
