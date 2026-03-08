import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { categorySchema } from "@/lib/validations"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const categories = await prisma.category.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(categories)
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
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const category = await prisma.category.create({
      data: { workspaceId: workspace.id, ...parsed.data },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
