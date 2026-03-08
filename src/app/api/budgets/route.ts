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

    return NextResponse.json(budgets)
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
