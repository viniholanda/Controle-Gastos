"use client"
import { useRef, useState, useCallback } from "react"
import { Camera, Upload, X, Loader2, RotateCcw, Check, ScanLine } from "lucide-react"
import { processReceiptImage, type ReceiptData } from "@/lib/ocr"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  onResult: (data: ReceiptData) => void
  onClose: () => void
}

type Step = "choose" | "camera" | "processing" | "result"

export function ReceiptScanner({ onResult, onClose }: Props) {
  const [step, setStep] = useState<Step>("choose")
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setStep("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.")
      setStep("choose")
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    stopCamera()
    setPreview(dataUrl)
    processImage(dataUrl)
  }, [stopCamera])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem (JPG, PNG, etc.)")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      processImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [])

  const processImage = async (imageSource: string) => {
    setStep("processing")
    setProgress(0)
    setError(null)
    try {
      const data = await processReceiptImage(imageSource, setProgress)
      setResult(data)
      setStep("result")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      if (msg.includes("ANTHROPIC_API_KEY")) {
        setError("Configure a variável ANTHROPIC_API_KEY no servidor para usar o scanner.")
      } else {
        setError(`Erro ao processar: ${msg}. Tente novamente com uma foto mais nítida.`)
      }
      setStep("choose")
    }
  }

  const handleRetry = () => {
    setPreview(null)
    setResult(null)
    setError(null)
    setStep("choose")
  }

  const handleConfirm = () => {
    if (result) {
      onResult(result)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Scanner de Cupom</h3>
        </div>
        <button
          type="button"
          onClick={() => { stopCamera(); onClose() }}
          className="rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step: Choose method */}
      {step === "choose" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tire uma foto ou selecione uma imagem do cupom fiscal para preencher automaticamente.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Tirar Foto</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Galeria</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Step: Camera */}
      {step === "camera" && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white/80 text-xs text-center">
                Posicione o cupom dentro da área marcada
              </p>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { stopCamera(); setStep("choose") }} className="flex-1">
              Cancelar
            </Button>
            <Button type="button" onClick={capturePhoto} className="flex-1">
              <Camera className="mr-2 h-4 w-4" />
              Capturar
            </Button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <div className="space-y-4 py-6">
          {preview && (
            <div className="relative rounded-xl overflow-hidden max-h-48 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Cupom" className="w-full object-contain max-h-48" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lendo cupom...</span>
              <span className="font-mono font-medium">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && result && (
        <div className="space-y-4">
          {preview && (
            <div className="rounded-xl overflow-hidden max-h-32 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Cupom" className="w-full object-contain max-h-32 opacity-60" />
            </div>
          )}

          <div className="space-y-2 rounded-lg border p-3">
            <h4 className="text-sm font-medium text-muted-foreground">Dados encontrados:</h4>

            {result.merchant && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estabelecimento</span>
                <span className="font-medium truncate ml-2">{result.merchant}</span>
              </div>
            )}
            {result.amount != null && result.amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-medium text-red-500">
                  R$ {result.amount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
            {result.date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{result.date.split("-").reverse().join("/")}</span>
              </div>
            )}
            {result.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagamento</span>
                <span className="font-medium">{result.paymentMethod}</span>
              </div>
            )}
            {result.cnpj && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CNPJ</span>
                <span className="font-mono text-xs">{result.cnpj}</span>
              </div>
            )}
            {result.items && result.items.length > 0 && (
              <div className="pt-1 border-t">
                <span className="text-xs text-muted-foreground">
                  {result.items.length} item(ns) detectado(s)
                </span>
              </div>
            )}

            {!result.amount && !result.merchant && !result.date && (
              <p className="text-sm text-muted-foreground italic">
                Nenhum dado reconhecido. Tente com uma foto mais nítida.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleRetry} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1"
              disabled={!result.amount && !result.merchant && !result.date}
            >
              <Check className="mr-2 h-4 w-4" />
              Usar Dados
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
