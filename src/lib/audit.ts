import { prisma } from "@/lib/prisma"

interface AuditOptions {
  workspaceId?: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  oldData?: unknown
  newData?: unknown
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(opts: AuditOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: opts.workspaceId,
        userId: opts.userId,
        action: opts.action,
        resource: opts.resource,
        resourceId: opts.resourceId,
        oldData: opts.oldData as any,
        newData: opts.newData as any,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
      },
    })
  } catch (err) {
    console.error("Failed to create audit log:", err)
  }
}
