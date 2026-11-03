import { NextResponse } from "next/server";
import { getLocalNetworkIp, getPublicVerificationBaseUrl } from "@/lib/network";

export async function GET() {
  const ip = getLocalNetworkIp();
  const baseUrl = getPublicVerificationBaseUrl();
  return NextResponse.json({
    ip,
    host: `${ip}:3000`,
    baseUrl,
  });
}

