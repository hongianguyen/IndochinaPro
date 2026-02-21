/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['faiss-node', 'mammoth', 'sharp'],
  },
  images: {
    domains: ['images.unsplash.com', 'plus.unsplash.com'],
  },
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
    responseLimit: false,
  },
}

module.exports = nextConfig
