/** @type {import('next').NextConfig} */
const nextConfig = {
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
