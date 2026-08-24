import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/branches — Fetch all branches
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(branches);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

// POST /api/branches — Create a new branch
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, location } = body;

    const newBranch = await prisma.branch.create({
      data: { name, location },
    });

    return NextResponse.json(newBranch, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}