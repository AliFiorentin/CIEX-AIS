import Link from "next/link"
import { TrendingDown, Waves } from "lucide-react"
import { HeaderLogos } from "@/components/HeaderLogos"

const PRIMARY = "#1E404A"

export type PaginaDanos = "perdas" | "fisicos"

const PAGINAS: { id: PaginaDanos; href: string; rotulo: string }[] = [
  { id: "perdas", href: "/perdas-operacionais", rotulo: "Perdas Operacionais" },
  { id: "fisicos", href: "/danos-fisicos", rotulo: "Danos Físicos" },
]

/**
 * Banner de título das páginas Perdas Operacionais e Danos Físicos. Os dois botões que alternavam as abas viraram
 * links entre as duas páginas; "← Dashboard" e "Metodologia →" continuam como antes.
 */
export function Banner({
  ativa,
  titulo,
  subtitulo,
  nota,
}: {
  ativa: PaginaDanos
  titulo: string
  subtitulo: string
  nota?: string
}) {
  const Icone = ativa === "perdas" ? TrendingDown : Waves
  const linkNav =
    "apple-pill flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/80 transition-all hover:bg-white/20 hover:text-white active:scale-95 shadow-xs"
  return (
    <header
      className="relative px-6 py-10 text-white overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, #255362 100%)`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div className="mx-auto flex max-w-[1440px] items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-2">
            <Link href="/" className={linkNav}>
              ← Dashboard
            </Link>
            <Link href="/metodologia" className={linkNav}>
              Metodologia →
            </Link>
          </div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-sky-200/80">
            CIEX · GPEA · FURG
          </p>
          <h1 className="mb-2 flex items-center gap-3 text-4xl leading-none font-black tracking-tight text-white">
            <Icone
              size={36}
              strokeWidth={2.5}
              className="shrink-0 text-sky-300 opacity-90"
            />
            {titulo}
          </h1>
          <p className="text-base font-medium text-white/80">{subtitulo}</p>
          {nota && (
            <p className="mt-3 font-mono text-[11px] text-white/50">{nota}</p>
          )}
          <nav
            className="mt-6 inline-flex rounded-full bg-black/20 p-1 border border-white/15 backdrop-blur-md gap-1"
            aria-label="Páginas de danos"
          >
            {PAGINAS.map(({ id, href, rotulo }) => (
              <Link
                key={id}
                href={href}
                aria-current={ativa === id ? "page" : undefined}
                className={`apple-pill rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
                  ativa === id
                    ? "bg-white text-[#1E404A] shadow-md"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {rotulo}
              </Link>
            ))}
          </nav>
        </div>
        <HeaderLogos />
      </div>
    </header>
  )
}
