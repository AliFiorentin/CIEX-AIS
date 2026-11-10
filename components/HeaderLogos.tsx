import Image from "next/image"

/**
 * Selo de logos (CIEX/GPEA) para o canto direito dos headers escuros de
 * /perdas e /metodologia — mesmo padrão de chip branco usado no header
 * principal do dashboard.
 */
export function HeaderLogos() {
  return (
    <div className="hidden shrink-0 items-center gap-3 self-center sm:flex">
      <div className="relative h-16 w-28 rounded-lg bg-white p-1.5">
        <Image
          src="/CIEX2.png"
          alt="CIEX"
          fill
          className="object-contain p-1.5"
        />
      </div>
      <div className="relative h-16 w-28 rounded-lg bg-white p-1.5">
        <Image
          src="/GPEA.png"
          alt="GPEA"
          fill
          className="object-contain p-1.5"
        />
      </div>
    </div>
  )
}
