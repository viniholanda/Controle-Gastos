import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY não configurada" }, { status: 500 })
  }

  try {
    const { image } = await req.json()
    if (!image) {
      return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 })
    }

    // image is base64 data URL: "data:image/jpeg;base64,..."
    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 400 })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    const result = await model.generateContent([
      {
        inlineData: { mimeType, data: base64Data },
      },
      `Analise este cupom fiscal/nota fiscal/recibo brasileiro e extraia os dados.

Retorne APENAS o JSON válido, sem markdown ou texto adicional:
{
  "amount": <valor total pago como número, ex: 45.90>,
  "date": "<data no formato YYYY-MM-DD ou null>",
  "merchant": "<nome do estabelecimento ou null>",
  "description": "<nome resumido do estabelecimento>",
  "paymentMethod": "<PIX|Crédito|Débito|Dinheiro|Voucher ou null>",
  "cnpj": "<apenas dígitos do CNPJ ou null>",
  "items": ["<produto/serviço 1>", "<produto 2>"]
}

Regras importantes:
- amount: procure TOTAL, VALOR TOTAL, TOTAL A PAGAR (use vírgula como decimal brasileiro)
- Se não encontrar algum campo, use null
- items: máximo 10 itens principais
- date: converta DD/MM/YYYY para YYYY-MM-DD`,
    ])

    const text = result.response.text()

    // Extract JSON — Gemini sometimes wraps in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Não foi possível extrair dados do cupom" }, { status: 422 })
    }

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao processar imagem"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
