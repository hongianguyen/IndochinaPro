/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'mammoth',
      'jszip',
      'langchain',
      '@langchain/openai',
      '@langchain/community',
      'openai',
      '@supabase/supabase-js',
      'pdfkit',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
}
module.exports = nextConfig
