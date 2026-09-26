import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const branchWhere =
      currentUser.role === "OWNER"
        ? undefined
        : currentUser.branchId
          ? { branchId: currentUser.branchId }
          : { branchId: "__NO_BRANCH__" };

    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        ...(currentUser.role === "OWNER"
          ? {}
          : {
              branchStocks: {
                some: branchWhere,
              },
            }),
      },
      include: {
        branchStocks: {
          where: branchWhere,
          include: {
            branch: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
