import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace } from "@/lib/workspace"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""

    const merchants = await prisma.merchant.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      },
      orderBy: { useCount: "desc" },
      take: 20,
    })

    return NextResponse.json(merchants)
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

    const { name, category, website } = await req.json()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const merchant = await prisma.merchant.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      create: { workspaceId: workspace.id, name, category, website },
      update: {},
    })

    return NextResponse.json(merchant, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
