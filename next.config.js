const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set the tracing root so Next doesn't pick an upper-level lockfile when multiple lockfiles exist
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
