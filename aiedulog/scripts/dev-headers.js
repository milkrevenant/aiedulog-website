/**
 * Development Headers Configuration
 * Ensures proper MIME types and cache control for static assets
 */

/**
 * Development-specific headers to prevent cache issues
 */
const developmentHeaders = [
  // Static asset headers for proper MIME types
  {
    source: '/static/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      },
      {
        key: 'Pragma',
        value: 'no-cache'
      },
      {
        key: 'Expires',
        value: '0'
      }
    ],
  },
  
  // Next.js static chunks
  {
    source: '/_next/static/chunks/:path*.js',
    headers: [
      {
        key: 'Content-Type',
        value: 'application/javascript; charset=utf-8'
      },
      {
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }
    ],
  },
  
  // CSS files
  {
    source: '/_next/static/css/:path*.css',
    headers: [
      {
        key: 'Content-Type',
        value: 'text/css; charset=utf-8'
      },
      {
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }
    ],
  },
  
  // Webpack hot updates
  {
    source: '/_next/static/webpack/:path*',
    headers: [
      {
        key: 'Content-Type',
        value: 'application/javascript; charset=utf-8'
      },
      {
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }
    ],
  },
  
  // Build manifests
  {
    source: '/_next/static/development/:path*',
    headers: [
      {
        key: 'Content-Type',
        value: 'application/javascript; charset=utf-8'
      },
      {
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }
    ],
  },
  
  // All Next.js static assets
  {
    source: '/_next/static/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      },
      {
        key: 'Pragma',
        value: 'no-cache'
      },
      {
        key: 'Expires',
        value: '0'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      }
    ],
  }
];

/**
 * Production headers for optimal caching
 */
const productionHeaders = [
  {
    source: '/_next/static/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable'
      }
    ],
  }
];

/**
 * Get headers configuration based on environment
 */
function getHeadersConfig() {
  return process.env.NODE_ENV === 'development' 
    ? developmentHeaders 
    : productionHeaders;
}

module.exports = {
  developmentHeaders,
  productionHeaders,
  getHeadersConfig
};