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
  nota: string
}) {
  const Icone = ativa === "perdas" ? TrendingDown : Waves
  const linkNav =
    "flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold text-white/70 transition-colors hover:border-white/40 hover:text-white"
  return (
    <header
      className="px-6 py-10 text-white"
      style={{ backgroundColor: PRIMARY }}
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
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-60">
            CIEX · GPEA · FURG
          </p>
          <h1 className="mb-2 flex items-center gap-3 text-4xl leading-none font-black tracking-tight">
            <Icone
              size={36}
              strokeWidth={2.5}
              className="shrink-0 opacity-80"
            />
            {titulo}
          </h1>
          <p className="text-base font-medium opacity-75">{subtitulo}</p>
          <p className="mt-3 font-mono text-[11px] opacity-50">{nota}</p>
          <nav
            className="mt-5 flex flex-wrap gap-2"
            aria-label="Páginas de danos"
          >
            {PAGINAS.map(({ id, href, rotulo }) => (
              <Link
                key={id}
                href={href}
                aria-current={ativa === id ? "page" : undefined}
                className="rounded-full border px-4 py-1.5 text-[11px] font-black transition-all duration-150"
                style={
                  ativa === id
                    ? {
                        backgroundColor: "#fff",
                        color: PRIMARY,
                        borderColor: "#fff",
                      }
                    : {
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.85)",
                        borderColor: "rgba(255,255,255,0.3)",
                      }
                }
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
