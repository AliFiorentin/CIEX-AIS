import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // /perdas passou a ser /danos (abas Operacionais e Físicos); preserva links antigos.
  async redirects() {
    return [{ source: "/perdas", destination: "/danos", permanent: true }];
  },
};

export default nextConfig;
