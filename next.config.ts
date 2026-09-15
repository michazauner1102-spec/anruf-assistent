import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zugriff vom Handy ueber die Rechner-IP im lokalen WLAN (npm run dev:lan).
  // Ohne diese Freigabe warnt bzw. blockt Next Dev-Requests fremder Origins.
  allowedDevOrigins: ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],
};

export default nextConfig;
