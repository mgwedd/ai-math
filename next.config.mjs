/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // small runtime image for the Docker build
  // Single-page app: the vanilla engine owns client-side routing via the
  // History API, but there are no Next route files for /lesson/*. Rewrite any
  // deep-link (e.g. a hard load of /lesson/la-vectors) back to the root page
  // so the app boots and the engine parses window.location itself.
  async rewrites() {
    return [{ source: '/lesson/:id', destination: '/' }];
  },
};

export default nextConfig;
