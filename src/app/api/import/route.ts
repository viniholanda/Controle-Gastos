import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace } from "@/lib/workspace"

interface ImportTransaction {
  date: string
  amount: number
  description: string
  type: "EXPENSE" | "INCOME"
  accountId: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 })
    }

    const body = await req.json()
    const { transactions, accountId } = body as {
      transactions: ImportTransaction[]
      accountId: string
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 })
    }

    if (!accountId) {
      return NextResponse.json({ error: "No account selected" }, { status: 400 })
    }

    // Verify the account belongs to this workspace
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, workspaceId: workspace.id, isActive: true },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Create all transactions in a single database transaction
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.createMany({
        data: transactions.map((t) => ({
          workspaceId: workspace.id,
          accountId,
          createdById: session.user.id,
          date: new Date(t.date),
          amount: Math.abs(t.amount),
          description: t.description || "",
          type: t.type,
          status: "CLEARED" as const,
          currency: "BRL",
        })),
      })

      // Update account balance based on imported transactions
      let balanceChange = 0
      for (const t of transactions) {
        const absAmount = Math.abs(t.amount)
        if (t.type === "INCOME") {
          balanceChange += absAmount
        } else {
          balanceChange -= absAmount
        }
      }

      if (balanceChange !== 0) {
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: balanceChange } },
        })
      }

      return created
    })

    return NextResponse.json({
      count: result.count,
      message: `${result.count} transactions imported successfully`,
    }, { status: 201 })
  } catch (err) {
    console.error("POST /api/import error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
