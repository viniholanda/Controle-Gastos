import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { budgetSchema } from "@/lib/validations"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const body = await req.json()
    const parsed = budgetSchema.partial().safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const budget = await prisma.budget.update({
      where: { id, workspaceId: workspace.id },
      data: {
        ...parsed.data,
        ...(parsed.data.startDate && { startDate: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate && { endDate: new Date(parsed.data.endDate) }),
      },
    })
    return NextResponse.json(budget)
  } catch (err) {
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

    await prisma.budget.delete({ where: { id, workspaceId: workspace.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
