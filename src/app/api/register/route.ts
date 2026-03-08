import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"
import { slugify } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.safeParse(body)

    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.data.email },
    })

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(data.data.password, 12)

    const user = await prisma.user.create({
      data: {
        name: data.data.name,
        email: data.data.email,
        passwordHash,
      },
    })

    // Create default workspace
    const slug = slugify(data.data.name) + "-" + Date.now()
    const workspace = await prisma.workspace.create({
      data: {
        name: `${data.data.name}'s Workspace`,
        slug,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    })

    // Create default categories
    const defaultCategories = [
      { name: "Food & Dining", color: "#f97316", icon: "utensils" },
      { name: "Transportation", color: "#3b82f6", icon: "car" },
      { name: "Housing", color: "#8b5cf6", icon: "home" },
      { name: "Healthcare", color: "#ef4444", icon: "heart-pulse" },
      { name: "Entertainment", color: "#ec4899", icon: "tv" },
      { name: "Shopping", color: "#f59e0b", icon: "shopping-bag" },
      { name: "Education", color: "#10b981", icon: "book" },
      { name: "Salary", color: "#22c55e", icon: "briefcase" },
      { name: "Freelance", color: "#06b6d4", icon: "laptop" },
      { name: "Investments", color: "#6366f1", icon: "trending-up" },
      { name: "Other", color: "#6b7280", icon: "more-horizontal" },
    ]

    await prisma.category.createMany({
      data: defaultCategories.map((c) => ({
        ...c,
        workspaceId: workspace.id,
      })),
    })

    // Create default account
    await prisma.financialAccount.create({
      data: {
        workspaceId: workspace.id,
        name: "Main Account",
        type: "BANK_ACCOUNT",
        currency: "BRL",
        initialBalance: 0,
        currentBalance: 0,
        isDefault: true,
        color: "#6366f1",
      },
    })

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (err) {
    console.error("Register error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
