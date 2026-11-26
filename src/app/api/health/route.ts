import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "foodsupply",
        database: "not_configured",
        timestamp,
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        service: "foodsupply",
        database: "connected",
        currency: process.env.DEFAULT_CURRENCY ?? "XOF",
        timestamp,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        service: "foodsupply",
        database: "unreachable",
        timestamp,
      },
      { status: 503 }
    );
  }
}
