import { nextTick, ref, type Ref } from 'vue'
import { m } from '../paraglide/messages'
import type { AlbumData } from '../service'
import type { ExportRatio } from './useAppSettings'

const EXPORT_FRAME_HEIGHT_RATIO = 0.9
const EXPORT_SIZE: Record<ExportRatio, { width: number; height: number }> = {
  '3:4': { width: 2400, height: 3200 },
  '9:16': { width: 1620, height: 2880 },
}

let snapdomLib: typeof import('@zumer/snapdom') | null = null

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(m.error_cover_load_failed()))
    img.src = src
  })
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function drawExportCredit(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  name: string,
  avatarSrc: string,
  imageCache?: Map<string, HTMLImageElement>,
) {
  const text = name.trim()
  if (!text) return

  const avatarSize = Math.round(Math.min(canvasWidth, canvasHeight) * 0.035)
  const textSize = Math.max(20, Math.round(Math.min(canvasWidth, canvasHeight) * 0.018))
  const gap = Math.max(8, Math.round(avatarSize * 0.3))
  const margin = Math.round(Math.min(canvasWidth, canvasHeight) * 0.02)

  ctx.save()
  ctx.font = `600 ${textSize}px Inter, sans-serif`
  const textMetrics = ctx.measureText(text)
  const textLeftInk = Math.max(0, Math.ceil(textMetrics.actualBoundingBoxLeft ?? 0))
  const textRightInk = Math.max(
    Math.ceil(textMetrics.width),
    Math.ceil(textMetrics.actualBoundingBoxRight ?? textMetrics.width),
  )
  const textAscent = Math.max(
    textSize * 0.8,
    Math.ceil(textMetrics.actualBoundingBoxAscent ?? textSize * 0.8),
  )
  const textDescent = Math.max(
    textSize * 0.2,
    Math.ceil(textMetrics.actualBoundingBoxDescent ?? textSize * 0.2),
  )
  const textInkWidth = Math.max(1, textLeftInk + textRightInk)
  const textInkHeight = Math.max(1, textAscent + textDescent)
  const hasAvatar = !!avatarSrc
  const contentWidth = (hasAvatar ? avatarSize + gap : 0) + textInkWidth
  const contentHeight = Math.max(avatarSize, textInkHeight)
  const x = canvasWidth - margin - contentWidth
  const y = canvasHeight - margin - contentHeight
  const textLeft = x + (hasAvatar ? avatarSize + gap : 0)
  const textDrawX = textLeft + textLeftInk
  const textBaselineY = y + Math.round((contentHeight - textInkHeight) / 2) + textAscent

  if (hasAvatar) {
    let avatar = imageCache?.get(avatarSrc)
    if (!avatar) {
      avatar = await loadImage(avatarSrc)
      imageCache?.set(avatarSrc, avatar)
    }
    const avatarY = Math.round(y + (contentHeight - avatarSize) / 2)
    const sourceWidth = Math.max(1, avatar.naturalWidth || avatar.width)
    const sourceHeight = Math.max(1, avatar.naturalHeight || avatar.height)
    const sourceSide = Math.min(sourceWidth, sourceHeight)
    const sourceX = Math.round((sourceWidth - sourceSide) / 2)
    const sourceY = Math.round((sourceHeight - sourceSide) / 2)
    ctx.save()
    ctx.beginPath()
    ctx.arc(x + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(
      avatar,
      sourceX,
      sourceY,
      sourceSide,
      sourceSide,
      x,
      avatarY,
      avatarSize,
      avatarSize,
    )
    ctx.restore()
  }

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, textDrawX, textBaselineY)
  ctx.restore()
}

async function getSnapdom() {
  if (!snapdomLib) {
    snapdomLib = await import('@zumer/snapdom')
  }
  return snapdomLib.snapdom
}

export function useImageExport(options: {
  albumData: Ref<AlbumData | null>
  exportRatio: Ref<ExportRatio>
  blurLevel: Ref<number>
  showCredit: Ref<boolean>
  creditName: Ref<string>
  avatarUrl: Ref<string>
  coverUrl: Ref<string>
}) {
  const { albumData, exportRatio, blurLevel, showCredit, creditName, avatarUrl, coverUrl } = options

  const phoneFrameRef = ref<HTMLElement | null>(null)
  const resultScreenRef = ref<HTMLElement | null>(null)
  const exporting = ref(false)
  const exportError = ref('')
  const exportRenderMode = ref(false)

  function getExportFileName(): string {
    const safeTitle =
      (albumData.value?.title || 'album').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'album'
    return `${safeTitle}_${exportRatio.value.replace(':', 'x')}.png`
  }

  async function generateAndDownloadImage() {
    if (!albumData.value || !phoneFrameRef.value || !resultScreenRef.value || exporting.value)
      return
    exporting.value = true
    exportError.value = ''
    exportRenderMode.value = true
    const perfStart = performance.now()
    const stepDurations: Record<string, number> = {}
    const markStep = (name: string, start: number) => {
      stepDurations[name] = Number((performance.now() - start).toFixed(1))
    }
    const imageCache = new Map<string, HTMLImageElement>()

    try {
      await nextTick()
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      const { width, height } = EXPORT_SIZE[exportRatio.value]
      const frameRect = phoneFrameRef.value.getBoundingClientRect()
      const resultRect = resultScreenRef.value.getBoundingClientRect()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error(m.error_canvas_context_failed())
      const loadCoverStart = performance.now()
      let cover = imageCache.get(coverUrl.value)
      if (!cover) {
        cover = await loadImage(coverUrl.value)
        imageCache.set(coverUrl.value, cover)
      }
      markStep('loadCover', loadCoverStart)

      const drawBgStart = performance.now()
      const scale = Math.max(width / cover.width, height / cover.height)
      const drawW = cover.width * scale
      const drawH = cover.height * scale
      const dx = (width - drawW) / 2
      const dy = (height - drawH) / 2

      ctx.save()
      ctx.filter = `blur(${blurLevel.value}px)`
      ctx.drawImage(cover, dx, dy, drawW, drawH)
      ctx.restore()

      ctx.fillStyle = 'rgba(14, 14, 14, 0.35)'
      ctx.fillRect(0, 0, width, height)
      markStep('drawBg', drawBgStart)

      const desiredInnerHeight = Math.round(height * EXPORT_FRAME_HEIGHT_RATIO)
      const captureScale = desiredInnerHeight / frameRect.height

      const previousScrollTop = resultScreenRef.value.scrollTop
      resultScreenRef.value.scrollTop = 0
      await nextTick()

      const snapdom = await getSnapdom()
      const snapdomStart = performance.now()
      let frameShot: HTMLCanvasElement
      try {
        frameShot = await snapdom.toCanvas(phoneFrameRef.value, {
          backgroundColor: 'transparent',
          scale: captureScale,
          dpr: 1,
          width: Math.round(frameRect.width),
          height: Math.round(frameRect.height),
          embedFonts: true,
          iconFonts: [/Material Symbols/i],
        })
      } finally {
        resultScreenRef.value.scrollTop = previousScrollTop
      }
      markStep('snapdomCapture', snapdomStart)

      const drawFrameStart = performance.now()
      const frameWidth = frameShot.width
      const frameHeight = frameShot.height
      const frameX = Math.round((width - frameWidth) / 2)
      const frameY = Math.round((height - frameHeight) / 2)
      ctx.drawImage(frameShot, frameX, frameY, frameWidth, frameHeight)
      markStep('drawFrame', drawFrameStart)

      const drawCreditStart = performance.now()
      if (showCredit.value) {
        await drawExportCredit(ctx, width, height, creditName.value, avatarUrl.value, imageCache)
      }
      markStep('drawCredit', drawCreditStart)
      frameShot.width = 0
      frameShot.height = 0
      imageCache.clear()

      const encodeStart = performance.now()
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1),
      )
      if (!blob) throw new Error(m.error_image_generate_failed())
      markStep('encodePng', encodeStart)

      await nextFrame()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = getExportFileName()
      link.click()
      URL.revokeObjectURL(url)
      if (import.meta.env.DEV) {
        const total = Number((performance.now() - perfStart).toFixed(1))
        console.groupCollapsed('[export-image] perf')
        console.log('params:', {
          ratio: exportRatio.value,
          width,
          height,
          frameRect: { width: frameRect.width, height: frameRect.height },
          resultRect: { width: resultRect.width, height: resultRect.height },
          captureScale: Number(captureScale.toFixed(3)),
          blurLevel: blurLevel.value,
        })
        console.table({ ...stepDurations, total })
        console.groupEnd()
      }
    } catch (err) {
      exportError.value = (err as Error).message || m.error_export_failed()
      console.error('[export-image] failed:', err)
    } finally {
      exportRenderMode.value = false
      exporting.value = false
    }
  }

  return {
    phoneFrameRef,
    resultScreenRef,
    exporting,
    exportError,
    exportRenderMode,
    generateAndDownloadImage,
  }
}
