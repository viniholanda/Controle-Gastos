import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const tags = await prisma.tag.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(tags)
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

    const { name, color } = await req.json()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      create: { workspaceId: workspace.id, name, color: color ?? "#6366f1" },
      update: {},
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
