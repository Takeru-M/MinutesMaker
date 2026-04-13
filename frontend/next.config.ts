import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  headers: async () => {
    return [
      {
        source: "/pdf.worker.min.mjs",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
      {
        source: "/pdf.worker.min.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
