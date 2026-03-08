"use client"
import { useState, useCallback } from "react"
import { Upload, CheckCircle2, AlertCircle, ArrowRight, X } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Step = "upload" | "mapping" | "preview" | "done"

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    setFile(file)
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 1500))
    setPreview([
      { date: "2024-01-15", description: "Supermercado Extra", amount: "-245.80", category: "Alimentação", status: "new" },
      { date: "2024-01-14", description: "Shell Posto", amount: "-120.00", category: "Transporte", status: "new" },
      { date: "2024-01-13", description: "Salário", amount: "5000.00", category: "Salário", status: "new" },
      { date: "2024-01-12", description: "Netflix", amount: "-55.90", category: "Entretenimento", status: "duplicate" },
      { date: "2024-01-11", description: "Farmácia", amount: "-89.50", category: "Saúde", status: "new" },
    ])
    setIsProcessing(false)
    setStep("preview")
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    setIsProcessing(true)
    const newRows = preview.filter((r) => r.status === "new")
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((r) => setTimeout(r, 300))
      setProgress(i)
    }
    setIsProcessing(false)
    setStep("done")
    toast.success(`${newRows.length} transações importadas com sucesso`)
  }

  const stepLabels: Record<string, string> = {
    upload: "Enviar Arquivo",
    preview: "Revisar Dados",
    done: "Concluído",
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Importar Transações</h1>
        <p className="text-muted-foreground text-sm">Importe a partir de arquivos CSV, Excel, OFX ou QIF</p>
      </div>

      {/* Indicador de etapas */}
      <div className="flex items-center gap-2">
        {(["upload", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step === s ? "bg-primary text-primary-foreground" :
                ["upload", "preview", "done"].indexOf(step) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
              {i + 1}
            </div>
            <span className="text-sm hidden sm:block">{stepLabels[s]}</span>
            {i < 2 && <div className="flex-1 h-px bg-border mx-2 hidden sm:block" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <div className="space-y-6">
          <Card
            className={`border-2 border-dashed cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <CardContent className="py-16 text-center">
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-lg font-medium mb-2">
                {isDragging ? "Solte o arquivo aqui" : "Envie seu arquivo de transações"}
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Arraste e solte ou clique para selecionar · CSV, Excel, OFX, QIF suportados
              </p>
              <Button variant="outline">Escolher Arquivo</Button>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls,.ofx,.qif"
                className="hidden"
                onChange={handleFileInput}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formatos suportados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { format: "CSV", desc: "Valores separados por vírgula", example: "Exportações de banco, planilhas" },
                  { format: "Excel", desc: "Arquivos .xlsx / .xls", example: "Arquivos do Microsoft Excel" },
                  { format: "OFX", desc: "Open Financial Exchange", example: "Formato de extrato bancário" },
                  { format: "QIF", desc: "Quicken Interchange", example: "Exportações do Quicken" },
                ].map((f) => (
                  <div key={f.format} className="p-3 rounded-lg bg-muted/50">
                    <div className="font-mono font-bold text-primary mb-1">.{f.format.toLowerCase()}</div>
                    <div className="text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          {isProcessing ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="font-medium">Processando seu arquivo...</p>
                <p className="text-muted-foreground text-sm mt-1">{file?.name}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Revisar Transações</CardTitle>
                      <CardDescription>
                        {preview.length} encontradas · {preview.filter((r) => r.status === "new").length} novas · {preview.filter((r) => r.status === "duplicate").length} duplicadas
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setFile(null); setPreview([]) }}>
                      <X className="h-4 w-4 mr-1" />
                      Recomeçar
                    </Button>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Data</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Descrição</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Categoria</th>
                        <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Valor</th>
                        <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className={`border-b ${row.status === "duplicate" ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
                          <td className="px-4 py-3 font-medium">{row.description}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{row.category}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.amount.startsWith("-") ? "text-red-500" : "text-emerald-600"}`}>
                            {row.amount.startsWith("-") ? "-" : "+"}R$ {Math.abs(parseFloat(row.amount)).toFixed(2).replace(".", ",")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.status === "new" ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Nova
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Duplicada
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setPreview([]) }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImport} loading={isProcessing}>
                    Importar {preview.filter((r) => r.status === "new").length} Transações
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {step === "done" && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Importação Concluída!</h2>
            <p className="text-muted-foreground mb-6">
              {preview.filter((r) => r.status === "new").length} transações foram importadas com sucesso.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setPreview([]); setProgress(0) }}>
                Importar Outro Arquivo
              </Button>
              <Button onClick={() => window.location.href = "/transactions"}>
                Ver Transações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
