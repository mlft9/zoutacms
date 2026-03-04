/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["10.0.0.185"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
