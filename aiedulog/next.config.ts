import type { NextConfig } from "next";

// Security headers for production
const securityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=()'
  },
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://cognito-idp.${process.env.COGNITO_REGION || 'ap-northeast-2'}.amazonaws.com https://${process.env.COGNITO_DOMAIN || 'your-domain'}.auth.${process.env.COGNITO_REGION || 'ap-northeast-2'}.amazoncognito.com; frame-src 'self' https://js.stripe.com https://${process.env.COGNITO_DOMAIN || 'your-domain'}.auth.${process.env.COGNITO_REGION || 'ap-northeast-2'}.amazoncognito.com https://www.canva.com https://docs.google.com https://www.youtube.com https://player.vimeo.com;`
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
];

const nextConfig: NextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Optimize images
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Environment variable validation
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },

  // AWS Amplify optimizations
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },

  // Better error handling for AWS Amplify builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Output configuration (Amplify or Docker standalone)
  output: process.env.AWS_APP_ID || process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,

  // Production webpack configuration
  webpack: (config: any, { isServer, dev }: { isServer: boolean; dev: boolean }) => {
    // AWS Amplify build detection
    const isAmplifyBuild = process.env.AWS_APP_ID || process.env._HANDLER || process.env.AMPLIFY_BUILD_MODE;
    
    if (isAmplifyBuild && !dev) {
      console.log('🚀 Optimizing for AWS Amplify build environment');
      
      // Disable webpack cache to prevent 404 errors
      config.cache = false;
      
      // Memory optimization for Amplify's 8GiB limit
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              maxSize: 500000, // 500KB chunks
            },
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };

      // NOTE: Do NOT alias '@mui/material' or '@mui/icons-material'.
      // Aliasing the package name to a specific file path breaks subpath imports
      // like '@mui/material/Grid' and '@mui/material/utils', which MUI and
      // its icon package rely on. Keep existing aliases intact without MUI.
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    // Fix for @excalidraw and other readonly property issues
    // Also disable Node.js-only modules for RDS/pg compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      http: false,
      https: false,
      url: false,
      net: false,
      tls: false,
      dns: false,  // Fix for pg module in client builds
    };

    // Additional optimizations for Edge Runtime compatibility
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Optimize specific packages for browser builds
        '@supabase/realtime-js': '@supabase/realtime-js',
      };
    }

    // Ignore source maps in Amplify builds for faster deployment
    if (isAmplifyBuild && !dev) {
      config.devtool = false;
    }

    return config;
  },
};

export default nextConfig;