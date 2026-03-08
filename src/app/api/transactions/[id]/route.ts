import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { transactionSchema } from "@/lib/validations"
import { getCurrentWorkspace } from "@/lib/workspace"
import { createAuditLog } from "@/lib/audit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const transaction = await prisma.transaction.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        account: true,
        transferTo: true,
        category: true,
        merchant: true,
        costCenter: true,
        tags: { include: { tag: true } },
        splits: { include: { category: true } },
        attachments: true,
      },
    })

    if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(transaction)
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const existing = await prisma.transaction.findFirst({
      where: { id, workspaceId: workspace.id },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req.json()
    const parsed = transactionSchema.partial().safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { tags, splits, date, ...data } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const oldBalanceChange =
        existing.type === "INCOME" ? -Number(existing.amount) :
        existing.type === "EXPENSE" ? Number(existing.amount) : 0

      if (oldBalanceChange !== 0) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: oldBalanceChange } },
        })
      }

      await tx.transactionTag.deleteMany({ where: { transactionId: id } })
      await tx.transactionSplit.deleteMany({ where: { transactionId: id } })

      const t = await tx.transaction.update({
        where: { id },
        data: {
          ...(date && { date: new Date(date) }),
          ...data,
          ...(tags !== undefined && { tags: { create: tags.map((tagId) => ({ tagId })) } }),
          ...(splits !== undefined && { isSplit: splits.length > 0, splits: { create: splits } }),
        },
        include: {
          account: true,
          category: true,
          merchant: true,
          tags: { include: { tag: true } },
          splits: { include: { category: true } },
        },
      })

      const newAmount = data.amount ?? Number(existing.amount)
      const newType = data.type ?? existing.type
      const newBalanceChange =
        newType === "INCOME" ? newAmount : newType === "EXPENSE" ? -newAmount : 0

      if (newBalanceChange !== 0) {
        await tx.financialAccount.update({
          where: { id: data.accountId ?? existing.accountId },
          data: { currentBalance: { increment: newBalanceChange } },
        })
      }

      return t
    })

    await createAuditLog({
      workspaceId: workspace.id,
      userId: session.user.id,
      action: "UPDATE",
      resource: "transaction",
      resourceId: id,
      oldData: existing,
      newData: updated,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const existing = await prisma.transaction.findFirst({
      where: { id, workspaceId: workspace.id },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id } })

      const balanceChange =
        existing.type === "INCOME" ? -Number(existing.amount) :
        existing.type === "EXPENSE" ? Number(existing.amount) : 0

      if (balanceChange !== 0) {
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: balanceChange } },
        })
      }
    })

    await createAuditLog({
      workspaceId: workspace.id,
      userId: session.user.id,
      action: "DELETE",
      resource: "transaction",
      resourceId: id,
      oldData: existing,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
