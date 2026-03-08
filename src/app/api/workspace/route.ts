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

    const fullWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      },
    })

    return NextResponse.json(fullWorkspace)
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const body = await req.json()
    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.currency && { currency: body.currency }),
        ...(body.timezone && { timezone: body.timezone }),
        ...(body.locale && { locale: body.locale }),
        ...(body.dateFormat && { dateFormat: body.dateFormat }),
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
