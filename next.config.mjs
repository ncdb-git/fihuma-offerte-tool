/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"]
  }
};

export default nextConfig;
