import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 })
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

    const mediaType = matches[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    const base64Data = matches[2]

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `Analise este cupom fiscal/nota fiscal/recibo e extraia os dados em JSON.

Retorne APENAS o JSON, sem texto adicional, no formato:
{
  "amount": <valor total em número, ex: 45.90>,
  "date": "<data no formato YYYY-MM-DD ou null>",
  "merchant": "<nome do estabelecimento ou null>",
  "description": "<nome do estabelecimento ou descrição resumida>",
  "paymentMethod": "<PIX|Crédito|Débito|Dinheiro|Voucher ou null>",
  "cnpj": "<CNPJ sem formatação ou null>",
  "items": ["<item 1>", "<item 2>", ...]
}

Regras:
- amount deve ser o VALOR TOTAL pago (procure por TOTAL, VALOR TOTAL, TOTAL A PAGAR)
- Se não encontrar algum campo, use null
- items: liste os principais produtos/serviços (máximo 10)
- date: converta para YYYY-MM-DD
- Se for nota em português do Brasil, os valores usam vírgula como decimal`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""

    // Extract JSON from response
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
