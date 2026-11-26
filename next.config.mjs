import { readFileSync } from "fs"

// App version shown in the dashboard footer: NEXT_PUBLIC_APP_VERSION when set,
// otherwise the "version" in package.json
const { version: packageVersion } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || packageVersion,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // next.config.js
  allowedDevOrigins: ['192.168.1.33:3000'],
 
}

export default nextConfig
