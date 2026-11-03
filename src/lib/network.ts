import os from "os";

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
 * Ensures that QR codes scanned by mobile phones point to a reachable network IP or Vercel domain,
 * avoiding "localhost refused to connect".
 */
export function getPublicVerificationBaseUrl(requestOrigin?: string): string {
  // 1. Production / Vercel Domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 2. If running locally, convert localhost/127.0.0.1 to LAN IP
  const lanIp = getLocalNetworkIp();

  if (requestOrigin) {
    if (requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1")) {
      return requestOrigin.replace("localhost", lanIp).replace("127.0.0.1", lanIp);
    }
    return requestOrigin;
  }

  return `http://${lanIp}:3000`;
}

