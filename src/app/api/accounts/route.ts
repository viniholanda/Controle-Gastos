import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { accountSchema } from "@/lib/validations"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const accounts = await prisma.financialAccount.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(accounts)
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
    const parsed = accountSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const account = await prisma.financialAccount.create({
      data: {
        workspaceId: workspace.id,
        ...parsed.data,
        currentBalance: parsed.data.initialBalance,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
