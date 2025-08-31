import type { NextConfig } from "next";

// Security headers to protect against XSS, clickjacking, and other attacks
const securityHeaders = [
  // Prevent XSS attacks
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Restrict dangerous browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  // Force HTTPS connections
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  // Content Security Policy - Ultra-strict protection
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "media-src 'self' https://*.supabase.co",
      "worker-src 'self' blob:"
    ].join('; ')
  },
  // Additional security headers
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none'
  }
];

const nextConfig: NextConfig = {
  // Enable security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  
  // Additional security configurations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration to fix Excalidraw readonly property issues
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Handle Excalidraw's ESM modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    // Add rule to handle Excalidraw's readonly properties
    config.module.rules.push({
      test: /node_modules\/@excalidraw\/excalidraw/,
      use: {
        loader: 'string-replace-loader',
        options: {
          search: /Object\.defineProperty\(([^,]+),\s*"([^"]+)",\s*\{\s*value:\s*([^,]+),\s*writable:\s*false/g,
          replace: 'Object.defineProperty($1, "$2", { value: $3, writable: true',
          flags: 'g'
        }
      }
    })
    
    return config
  }
};

export default nextConfig;
