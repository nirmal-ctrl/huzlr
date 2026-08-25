const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
const remotePatterns = []

if (strapiUrl) {
  try {
    const { protocol, hostname, port } = new URL(strapiUrl)
    remotePatterns.push({
      protocol: protocol.replace(':', ''),
      hostname,
      port,
      pathname: '/**',
    })
  } catch {
    // Build without a remote image pattern when the configured URL is invalid.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns,
  },
}

export default nextConfig
