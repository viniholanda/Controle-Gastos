import { prisma } from "@/lib/prisma"

export async function getCurrentWorkspace(userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  })
  return member?.workspace ?? null
}

export async function getUserWorkspaces(userId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  })
  return members
}

export async function requireWorkspaceAccess(
  workspaceId: string,
  userId: string,
  minRole: "OWNER" | "EDITOR" | "VIEWER" = "VIEWER"
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })

  if (!member) {
    throw new Error("Access denied")
  }

  const roleOrder = { VIEWER: 0, EDITOR: 1, OWNER: 2 }
  if (roleOrder[member.role] < roleOrder[minRole]) {
    throw new Error("Insufficient permissions")
  }

  return member
}
