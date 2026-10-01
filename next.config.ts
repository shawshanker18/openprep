import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lessons are read from disk at request time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    "/skills/*": ["./content/lessons/**/*.md"],
    "/dashboard": ["./content/**/*.md"],
    "/plan": ["./content/**/*.md"],
    "/desmos/*": ["./content/desmos/**/*.md"],
  },
};

export default nextConfig;
