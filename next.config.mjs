/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Already matches any https host, including Supabase Storage's
      // <project-ref>.supabase.co - the explicit entries below are
      // redundant under this wildcard but documented anyway, since
      // "**" makes it easy to lose track of which hosts actually matter.
      { protocol: "https", hostname: "**" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cqpxiassldkmusngqorx.supabase.co" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/business",
        destination: "https://qoyl-business-nine.vercel.app",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
