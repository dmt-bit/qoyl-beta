/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
