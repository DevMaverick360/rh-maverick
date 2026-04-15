import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Evita que o bundler quebre a resolução de `pdf.worker.mjs` (pdf-parse / pdfjs-dist no servidor). */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
