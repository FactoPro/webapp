import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Autorise l'accès aux ressources du serveur de dev depuis 127.0.0.1
  // (certains navigateurs / outils ne résolvent pas "localhost").
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
