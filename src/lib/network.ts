import os from "os";
import fs from "fs";
import path from "path";

/**
 * Returns the IPv4 address of the host machine on the local network (e.g. 10.82.179.100 / 192.168.x.x)
 * so that smartphones and external devices scanning the QR code can connect directly.
 */
export function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    // Fallback
  }
  return "10.82.179.100";
}

/**
 * Resolves the public verification base URL for QR codes.
 * Ensures that QR codes scanned by mobile phones point to a reachable public tunnel,
 * Vercel domain, or network IP so they scan easily and work from anywhere in the world.
 */
export function getPublicVerificationBaseUrl(requestOrigin?: string): string {
  // 1. Production / Vercel Domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 2. Active Public HTTPS Tunnel (accessible worldwide on 4G/5G mobile internet)
  try {
    const tunnelFile = path.join(process.cwd(), ".tunnel-url");
    if (fs.existsSync(tunnelFile)) {
      const url = fs.readFileSync(tunnelFile, "utf-8").trim();
      if (url.startsWith("http")) {
        return url.replace(/\/$/, "");
      }
    }
  } catch {
    // Ignore read error
  }

  // 3. If request came from a public non-local domain
  if (
    requestOrigin &&
    !requestOrigin.includes("localhost") &&
    !requestOrigin.includes("127.0.0.1")
  ) {
    return requestOrigin;
  }

  // 4. Local network IP fallback
  const lanIp = getLocalNetworkIp();

  if (requestOrigin) {
    if (requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1")) {
      return requestOrigin.replace("localhost", lanIp).replace("127.0.0.1", lanIp);
    }
    return requestOrigin;
  }

  return `http://${lanIp}:3000`;
}

