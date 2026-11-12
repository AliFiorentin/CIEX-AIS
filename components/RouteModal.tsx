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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-3 sm:px-4 py-4 sm:py-6"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="animate-scale-in relative w-full max-w-[1440px] overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
        <button
          onClick={close}
          aria-label="Fechar"
          title="Fechar (Esc)"
          className="apple-button absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md backdrop-blur-md transition-all active:scale-95 border border-slate-200/60"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
        {children}
      </div>
    </div>
  )
}
