import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { budgetSchema } from "@/lib/validations"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const budgets = await prisma.budget.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      include: { category: { select: { name: true, color: true, icon: true } } },
      orderBy: { createdAt: "desc" },
    })

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const endDate = budget.endDate ?? new Date()
        const where: Record<string, unknown> = {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: budget.startDate, lte: endDate },
        }
        if (budget.categoryId) {
          where.categoryId = budget.categoryId
        }
        const result = await prisma.transaction.aggregate({
          where,
          _sum: { amount: true },
        })
        return {
          ...budget,
          spent: Number(result._sum.amount ?? 0),
        }
      })
    )

    return NextResponse.json(budgetsWithSpent)
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const body = await req.json()
    const parsed = budgetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const budget = await prisma.budget.create({
      data: {
        workspaceId: workspace.id,
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        ...(parsed.data.endDate && { endDate: new Date(parsed.data.endDate) }),
      },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
