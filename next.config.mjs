/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "https", hostname: "res.cloudinary.com" },
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
