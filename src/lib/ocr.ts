import Tesseract from "tesseract.js"

export interface ReceiptData {
  amount?: number
  date?: string
  description?: string
  merchant?: string
  items?: string[]
  cnpj?: string
  paymentMethod?: string
}

export async function processReceiptImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<ReceiptData> {
  const result = await Tesseract.recognize(imageSource, "por", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  return parseReceiptText(result.data.text)
}

export function parseReceiptText(text: string): ReceiptData {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const data: ReceiptData = { items: [] }

  // CNPJ
  const cnpjMatch = text.match(/\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/)
  if (cnpjMatch) {
    data.cnpj = cnpjMatch[0].replace(/[\s]/g, "")
  }

  // Merchant name: usually first non-empty lines before CNPJ
  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && !/^\d/.test(line) && !line.match(/cnpj|cpf|cupom|nota/i)) {
      data.merchant = line
      break
    }
  }

  // Date: DD/MM/YYYY or DD/MM/YY
  const dateMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/)
  if (dateMatch) {
    const [, day, month, yearRaw] = dateMatch
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    data.date = `${year}-${month}-${day}`
  }

  // Total amount: look for keywords like TOTAL, VALOR, SUBTOTAL
  const totalPatterns = [
    /(?:total|valor\s*total|total\s*geral|subtotal|vl\.?\s*total)[:\s]*R?\$?\s*([\d.,]+)/i,
    /R\$\s*([\d.,]+)\s*$/im,
    /(?:total|valor)[^\n]*?([\d]+[.,]\d{2})/i,
  ]

  let maxAmount = 0
  for (const pattern of totalPatterns) {
    const match = text.match(pattern)
    if (match) {
      const val = parseAmount(match[1])
      if (val > maxAmount) {
        maxAmount = val
        data.amount = val
      }
    }
  }

  // If no total found, find the largest monetary value
  if (!data.amount) {
    const allAmounts = text.matchAll(/(\d+)[.,](\d{2})\b/g)
    for (const m of allAmounts) {
      const val = parseAmount(m[0])
      if (val > maxAmount && val < 100000) {
        maxAmount = val
        data.amount = val
      }
    }
  }

  // Items: lines with value patterns (qty x price or just price)
  const itemLines = lines.filter((line) => {
    return (
      /\d+[.,]\d{2}/.test(line) &&
      !/total|subtotal|troco|desconto|cnpj|cpf|data|hora/i.test(line) &&
      line.length > 5
    )
  })
  data.items = itemLines.slice(0, 15)

  // Payment method
  if (/pix/i.test(text)) data.paymentMethod = "PIX"
  else if (/d[eé]bito/i.test(text)) data.paymentMethod = "Débito"
  else if (/cr[eé]dito/i.test(text)) data.paymentMethod = "Crédito"
  else if (/dinheiro|especie/i.test(text)) data.paymentMethod = "Dinheiro"

  // Description: merchant + item count
  if (data.merchant) {
    data.description = data.merchant
  }

  return data
}

function parseAmount(str: string): number {
  // Brazilian format: 1.234,56 or 1234,56
  const cleaned = str.replace(/\./g, "").replace(",", ".")
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}
