"use client"

import React, { useLayoutEffect, useRef, useState } from "react"

interface Props {
  children: React.ReactNode
  /** Escala mínima/máxima aplicada ao conteúdo para caber na altura disponível. */
  min?: number
  max?: number
  className?: string
}

/**
 * Ajusta o conteúdo à altura disponível (sem rolagem): mede a altura natural do
 * filho e aplica transform: scale para que ele ocupe exatamente o espaço do
 * pai, respeitando [min, max]. A largura é compensada para não encolher na horizontal.
 * O pai precisa ter altura definida (flex-1 min-h-0).
 */
export function FitHeight({
  children,
  min = 0.45,
  max = 1.25,
  className,
}: Props) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [rolavel, setRolavel] = useState(false)

  useLayoutEffect(() => {
    const o = outer.current,
      i = inner.current
    if (!o || !i) return
    const medir = () => {
      // Celular/tablet: sem encolher, o conteúdo rola.
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(min-width: 1024px), (pointer: fine)").matches
      ) {
        setEscala((prev) => (prev === 1 ? prev : 1))
        setRolavel(true)
        return
      }
      const cs = getComputedStyle(o)
      const padTop = parseFloat(cs.paddingTop) || 0
      const padBottom = parseFloat(cs.paddingBottom) || 0
      // Margem de segurança de 16px para garantir que a última linha, links e notas nunca fiquem colados ou cortados
      const disponivel = Math.max(0, o.clientHeight - padTop - padBottom - 16)
      if (disponivel <= 0) return

      // A altura natural depende da escala (a largura do filho é 100/escala %, e o texto quebra de
      // linha diferente). Busca binária pela maior escala cuja altura *escalada* cabe com folga.
      const cabe = (s: number) => {
        i.style.width = `${100 / s}%`
        const h = i.offsetHeight
        return h > 0 && h * s <= disponivel
      }
      let lo = min,
        hi = max
      if (cabe(hi)) {
        lo = hi
      } else {
        for (let k = 0; k < 9; k++) {
          const mid = (lo + hi) / 2
          if (cabe(mid)) lo = mid
          else hi = mid
        }
      }

      i.style.width = `${100 / lo}%`
      const hFinal = i.offsetHeight
      // Se mesmo no limite mínimo não couber totalmente na altura, ativa rolagem para nada ser perdido
      if (hFinal > 0 && hFinal * lo > disponivel + 1) {
        setRolavel(true)
      } else {
        setRolavel(false)
      }
      setEscala((prev) => (Math.abs(prev - lo) < 0.003 ? prev : lo))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(o)
    ro.observe(i)
    const mo = new MutationObserver(medir)
    mo.observe(i, { childList: true, subtree: true, characterData: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [min, max])

  return (
    <div
      ref={outer}
      tabIndex={rolavel ? 0 : undefined}
      className={`min-h-0 flex-1 overflow-hidden ${rolavel ? "overflow-y-auto" : ""} ${className ?? ""}`}
    >
      <div
        ref={inner}
        style={{
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          width: `${100 / escala}%`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
