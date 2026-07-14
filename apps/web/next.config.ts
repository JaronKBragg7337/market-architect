import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "market-architect";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? `/${repositoryName}` : "",
  transpilePackages: ["@market-architect/engine", "@market-architect/shared", "@market-architect/market-data"],
};

export default nextConfig;
