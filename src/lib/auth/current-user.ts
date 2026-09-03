import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("purple_yam_session")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = verifySessionToken(sessionToken);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      username: true,
      role: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
  });

  return user;
}