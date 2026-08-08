/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal standalone server bundle, ideal for the Docker runtime image.
  output: 'standalone',
};

module.exports = nextConfig;
