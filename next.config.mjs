import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Danos virou duas páginas: /perdas-operacionais e /danos-fisicos. Preserva todos os links antigos:
  // /danos?aba=fisico (a regra específica vem antes da genérica), /danos e /perdas.
  async redirects() {
    return [
      {
        source: "/danos",
        has: [{ type: "query", key: "aba", value: "fisico" }],
        destination: "/danos-fisicos",
        permanent: true,
      },
      { source: "/danos", destination: "/perdas-operacionais", permanent: true },
      { source: "/perdas", destination: "/perdas-operacionais", permanent: true },
    ];
  },
};

export default nextConfig;
