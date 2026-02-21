/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude native/server-only packages from webpack bundling
  experimental: {
    serverComponentsExternalPackages: [
      'faiss-node',
      'mammoth',
      'sharp',
      'langchain',
      '@langchain/openai',
      '@langchain/community',
      'openai',
      'jszip',
    ],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },

  // Tell webpack to ignore native modules it cannot bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
        child_process: false,
      }
    }

    // Ignore binary native addons
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    })

    // Ignore optional/native deps that cause webpack errors
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push(
        'faiss-node',
        '@zilliz/milvus2-sdk-node',
        'hnswlib-node',
        'chromadb',
        'weaviate-ts-client',
      )
    }

    return config
  },
}

module.exports = nextConfig
