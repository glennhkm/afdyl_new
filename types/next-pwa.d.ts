declare module "@ducanh2912/next-pwa" {
  import type { NextConfig } from "next";
  import type { RuntimeCaching } from "workbox-build";

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    skipWaiting?: boolean;
    cacheOnFrontEndNav?: boolean;
    aggressiveFrontEndNavCaching?: boolean;
    reloadOnOnline?: boolean;
    publicExcludes?: string[];
    buildExcludes?: (string | RegExp)[];
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
    customWorkerDir?: string;
    customWorkerSrc?: string;
    customWorkerDest?: string;
    customWorkerPrefix?: string;
    workboxOptions?: {
      disableDevLogs?: boolean;
      runtimeCaching?: RuntimeCaching[];
      [key: string]: unknown;
    };
  }

  function withPWA(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}
