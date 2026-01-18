/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  // Add this section to fix the Tesseract error
  serverExternalPackages: ['tesseract.js'],
};

module.exports = withPWA(nextConfig);