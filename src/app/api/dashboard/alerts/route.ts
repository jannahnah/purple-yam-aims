import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Task D: Fetch active PENDING alerts para sa Dashboard
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const alerts = await prisma.reorderAlert.findMany({
      where: {
        status: "PENDING",
        ...(branchId ? { branchId } : {}),
      },
      include: {
        item: {
          include: {
            branchStocks: true,
          },
        },
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(alerts, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dashboard alerts" },
      { status: 500 }
    );
  }
}