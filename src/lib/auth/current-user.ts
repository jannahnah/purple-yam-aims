import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/session";

type GetCurrentUserOptions = {
  allowPasswordChange?: boolean;
};

export async function getCurrentUser(
  options: GetCurrentUserOptions = {}
) {
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
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      branchId: true,
      businessId: true,
      branch: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  if (
    user.mustChangePassword &&
    !options.allowPasswordChange
  ) {
    return null;
  }

  return user;
}