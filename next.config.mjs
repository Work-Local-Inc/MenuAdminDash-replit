/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
  },
  images: {
    domains: ['nthpbtdjhhnwfxqsxbvy.supabase.co'],
  },

  // Security headers - Critical for production
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy - Prevent XSS attacks
          // Note: 'unsafe-eval' and 'unsafe-inline' needed for Next.js dev mode
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              isDev 
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://api.mapbox.com"
                : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://api.mapbox.com",
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
              "img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.mapbox.com wss://*.supabase.co",
              "frame-src https://js.stripe.com",
              "worker-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
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
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          // Strict Transport Security (HTTPS only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  },

  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Optimize production builds
  swcMinify: true,
};

export default nextConfig;
