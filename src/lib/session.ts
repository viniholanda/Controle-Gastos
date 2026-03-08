import { prisma } from "@/lib/prisma"

const DEFAULT_USER = {
  id: "default-user",
  name: "Usuário",
  email: "usuario@fintrack.local",
}

async function ensureDefaultUser() {
  const existing = await prisma.user.findUnique({ where: { id: DEFAULT_USER.id } })
  if (existing) return existing

  const user = await prisma.user.create({
    data: {
      id: DEFAULT_USER.id,
      name: DEFAULT_USER.name,
      email: DEFAULT_USER.email,
    },
  })

  // Cria workspace padrão
  const workspace = await prisma.workspace.create({
    data: {
      name: "Meu Espaço",
      slug: "meu-espaco",
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  })

  // Categorias padrão
  await prisma.category.createMany({
    data: [
      { name: "Alimentação", color: "#f97316", icon: "utensils", workspaceId: workspace.id },
      { name: "Transporte", color: "#3b82f6", icon: "car", workspaceId: workspace.id },
      { name: "Moradia", color: "#8b5cf6", icon: "home", workspaceId: workspace.id },
      { name: "Saúde", color: "#ef4444", icon: "heart-pulse", workspaceId: workspace.id },
      { name: "Entretenimento", color: "#ec4899", icon: "tv", workspaceId: workspace.id },
      { name: "Compras", color: "#f59e0b", icon: "shopping-bag", workspaceId: workspace.id },
      { name: "Educação", color: "#10b981", icon: "book", workspaceId: workspace.id },
      { name: "Salário", color: "#22c55e", icon: "briefcase", workspaceId: workspace.id },
      { name: "Freelance", color: "#06b6d4", icon: "laptop", workspaceId: workspace.id },
      { name: "Investimentos", color: "#6366f1", icon: "trending-up", workspaceId: workspace.id },
      { name: "Outros", color: "#6b7280", icon: "more-horizontal", workspaceId: workspace.id },
    ],
  })

  // Conta financeira padrão
  await prisma.financialAccount.create({
    data: {
      workspaceId: workspace.id,
      name: "Conta Principal",
      type: "BANK_ACCOUNT",
      currency: "BRL",
      initialBalance: 0,
      currentBalance: 0,
      isDefault: true,
      color: "#6366f1",
    },
  })

  return user
}

export async function getSession() {
  const user = await ensureDefaultUser()
  return { user: { id: user.id } }
}
