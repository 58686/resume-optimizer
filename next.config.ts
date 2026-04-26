import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mammoth", "pdf-parse"]
};

export default nextConfig;
