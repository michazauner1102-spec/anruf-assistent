import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zugriff vom Handy über die Rechner-IP im lokalen WLAN (npm run dev:lan).
  // Achtung: Die App hat keine Anmeldung — siehe Sicherheitsabschnitt der README.
  allowedDevOrigins: ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // Keine Adresse der aufgerufenen Firmenwebsite an Dritte weitergeben.
          { key: "Referrer-Policy", value: "no-referrer" },
          // Mikrofon nur für diese Seite, alles andere aus.
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
