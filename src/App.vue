<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { AlbumData } from './service'
import { MusicLinkParser } from './service'
import { m } from './paraglide/messages'
import { getLocale, setLocale } from './paraglide/runtime'

type ViewState = 'input' | 'result'
type Platform = 'Spotify' | 'AppleMusic'
type TextAlignMode = 'left' | 'center' | 'right'
type ExportRatio = '3:4' | '9:16'
type FrameTheme = 'dark' | 'light'

const parser = new MusicLinkParser()

const viewState = ref<ViewState>('input')
const inputUrl = ref('')
const loading = ref(false)
const errorMsg = ref('')
const albumData = ref<AlbumData | null>(null)
const blurLevel = ref(20)
const titleAlign = ref<TextAlignMode>('center')
const exportRatio = ref<ExportRatio>('3:4')
const frameTheme = ref<FrameTheme>('dark')
const exporting = ref(false)
const exportError = ref('')
const phoneFrameRef = ref<HTMLElement | null>(null)
const resultScreenRef = ref<HTMLElement | null>(null)
const exportRenderMode = ref(false)
const customAccentColor = ref('')
const creditName = ref('@your_name')
const avatarUrl = ref('')
const avatarFileInputRef = ref<HTMLInputElement | null>(null)
const showCredit = ref(true)
const isMobilePanelOpen = ref(false)
const STORAGE_CREDIT_NAME_KEY = 'music-shot:credit-name'
const STORAGE_AVATAR_URL_KEY = 'music-shot:avatar-url'
const STORAGE_SHOW_CREDIT_KEY = 'music-shot:show-credit'
const STORAGE_LOCALE_KEY = 'music-shot:locale'
const STORAGE_BLUR_LEVEL_KEY = 'music-shot:blur-level'
const STORAGE_EXPORT_RATIO_KEY = 'music-shot:export-ratio'
const STORAGE_FRAME_THEME_KEY = 'music-shot:frame-theme'
const STORAGE_TITLE_ALIGN_KEY = 'music-shot:title-align'
const STORAGE_DEBUG_PREFIX = '[credit-storage]'
const GITHUB_REPO_URL = 'https://github.com/ianho7/music-shot'
let snapdomLib: typeof import('@zumer/snapdom') | null = null
const locale = ref<'en' | 'zh'>('en')

const EXPORT_FRAME_HEIGHT_RATIO = 0.90
const EXPORT_SIZE: Record<ExportRatio, { width: number; height: number }> = {
  '3:4': { width: 2400, height: 3200 },
  '9:16': { width: 1620, height: 2880 },
}

function detectBrowserLocale(): 'en' | 'zh' {
  const lang = (navigator.language || '').toLowerCase()
  return lang.startsWith('zh') ? 'zh' : 'en'
}

function initLocale() {
  let nextLocale: 'en' | 'zh' = 'en'
  try {
    const saved = localStorage.getItem(STORAGE_LOCALE_KEY)
    if (saved === 'zh' || saved === 'en') {
      nextLocale = saved
    } else {
      nextLocale = detectBrowserLocale()
    }
  } catch {
    nextLocale = detectBrowserLocale()
  }
  setLocale(nextLocale, { reload: false })
  locale.value = getLocale()
}

function changeLocale(next: 'en' | 'zh') {
  setLocale(next, { reload: false })
  locale.value = getLocale()
  try {
    localStorage.setItem(STORAGE_LOCALE_KEY, locale.value)
  } catch {
    // ignore
  }
}

function openGithubRepo() {
  window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer')
}

function toggleMobilePanel() {
  isMobilePanelOpen.value = !isMobilePanelOpen.value
}

function closeMobilePanel() {
  isMobilePanelOpen.value = false
}

function detectAndValidateAlbumUrl(rawUrl: string): { platform: Platform; cleanedUrl: string } {
  if (!rawUrl.trim()) {
    throw new Error(m.error_empty_url())
  }

  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new Error(m.error_invalid_url_format())
  }

  const hostname = url.hostname.toLowerCase()
  const pathname = decodeURIComponent(url.pathname)

  const spotifyMatch = pathname.match(/\/album\/([a-zA-Z0-9]+)(?:\/|$)/)
  if (hostname.includes('spotify.com')) {
    if (!spotifyMatch) throw new Error(m.error_invalid_spotify_url())
    return { platform: 'Spotify', cleanedUrl: url.toString() }
  }

  const appleMatch = pathname.match(/\/album\/.+\/(\d+)(?:\?|$|\/)/)
  if (hostname.includes('apple.com')) {
    if (!appleMatch) throw new Error(m.error_invalid_apple_url())
    return { platform: 'AppleMusic', cleanedUrl: url.toString() }
  }

  throw new Error(m.error_unsupported_platform())
}

async function handleSubmit() {
  errorMsg.value = ''
  try {
    const { cleanedUrl } = detectAndValidateAlbumUrl(inputUrl.value)
    loading.value = true
    const result = await parser.parse(cleanedUrl)
    albumData.value = result
    customAccentColor.value = ''
    viewState.value = 'result'
  } catch (error) {
    errorMsg.value = (error as Error).message || m.error_parse_failed()
  } finally {
    loading.value = false
  }
}

function handleBack() {
  viewState.value = 'input'
}

function resetAccentColor() {
  customAccentColor.value = ''
}

function updateAccentColor(event: Event) {
  const target = event.target as HTMLInputElement
  customAccentColor.value = target.value || ''
}

function clearAvatar() {
  if (avatarUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarUrl.value)
  }
  avatarUrl.value = ''
  if (avatarFileInputRef.value) {
    avatarFileInputRef.value.value = ''
  }
}

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(m.error_avatar_read_failed()))
    reader.readAsDataURL(file)
  })
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(m.error_avatar_load_failed()))
    img.src = src
  })
}

async function compressAvatarToDataURL(file: File): Promise<string> {
  const sourceUrl = await readFileAsDataURL(file)
  const img = await loadImageElement(sourceUrl)
  const maxSide = 160
  const srcW = Math.max(1, img.naturalWidth || img.width)
  const srcH = Math.max(1, img.naturalHeight || img.height)
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  const outW = Math.max(1, Math.round(srcW * scale))
  const outH = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(m.error_avatar_compress_failed())
  ctx.drawImage(img, 0, 0, outW, outH)

  const webp = canvas.toDataURL('image/webp', 0.82)
  if (webp && webp.startsWith('data:image/webp')) return webp
  return canvas.toDataURL('image/jpeg', 0.82)
}

async function handleAvatarUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !file.type.startsWith('image/')) return

  if (avatarUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarUrl.value)
  }
  console.log(`${STORAGE_DEBUG_PREFIX} upload-start`, {
    name: file.name,
    type: file.type,
    size: file.size,
  })
  avatarUrl.value = await compressAvatarToDataURL(file)
  console.log(`${STORAGE_DEBUG_PREFIX} upload-compressed`, {
    dataUrlLength: avatarUrl.value.length,
    approxKB: Math.round((avatarUrl.value.length * 2) / 1024),
  })
}

function estimateStorageBytes(): number {
  let bytes = 0
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || ''
    const value = localStorage.getItem(key) || ''
    bytes += (key.length + value.length) * 2
  }
  return bytes
}

function setStorageItemWithLog(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
    console.log(`${STORAGE_DEBUG_PREFIX} set-ok`, {
      key,
      valueLength: value.length,
      totalBytes: estimateStorageBytes(),
    })
  } catch (error) {
    console.error(`${STORAGE_DEBUG_PREFIX} set-failed`, {
      key,
      valueLength: value.length,
      error,
      totalBytes: estimateStorageBytes(),
    })
  }
}

function parseSavedBlurLevel(raw: string | null): number {
  if (!raw) return 20
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 20
  return Math.min(40, Math.max(0, Math.round(parsed)))
}

function parseSavedExportRatio(raw: string | null): ExportRatio {
  return raw === '3:4' || raw === '9:16' ? raw : '3:4'
}

function parseSavedFrameTheme(raw: string | null): FrameTheme {
  return raw === 'dark' || raw === 'light' ? raw : 'dark'
}

function parseSavedTitleAlign(raw: string | null): TextAlignMode {
  return raw === 'left' || raw === 'center' || raw === 'right' ? raw : 'center'
}

onMounted(() => {
  initLocale()
  try {
    const savedName = localStorage.getItem(STORAGE_CREDIT_NAME_KEY)
    const savedAvatar = localStorage.getItem(STORAGE_AVATAR_URL_KEY)
    const savedShowCredit = localStorage.getItem(STORAGE_SHOW_CREDIT_KEY)
    const savedBlurLevel = localStorage.getItem(STORAGE_BLUR_LEVEL_KEY)
    const savedExportRatio = localStorage.getItem(STORAGE_EXPORT_RATIO_KEY)
    const savedFrameTheme = localStorage.getItem(STORAGE_FRAME_THEME_KEY)
    const savedTitleAlign = localStorage.getItem(STORAGE_TITLE_ALIGN_KEY)
    if (savedName) creditName.value = savedName
    if (savedAvatar) avatarUrl.value = savedAvatar
    if (savedShowCredit === 'true' || savedShowCredit === 'false') {
      showCredit.value = savedShowCredit === 'true'
    }
    blurLevel.value = parseSavedBlurLevel(savedBlurLevel)
    exportRatio.value = parseSavedExportRatio(savedExportRatio)
    frameTheme.value = parseSavedFrameTheme(savedFrameTheme)
    titleAlign.value = parseSavedTitleAlign(savedTitleAlign)
    console.log(`${STORAGE_DEBUG_PREFIX} mounted-read`, {
      hasName: !!savedName,
      nameLength: savedName?.length ?? 0,
      hasAvatar: !!savedAvatar,
      avatarLength: savedAvatar?.length ?? 0,
      showCredit: savedShowCredit,
      blurLevel: blurLevel.value,
      exportRatio: exportRatio.value,
      frameTheme: frameTheme.value,
      titleAlign: titleAlign.value,
      totalBytes: estimateStorageBytes(),
    })
  } catch {
    console.error(`${STORAGE_DEBUG_PREFIX} mounted-read-failed`)
  }
})

watch(creditName, (value) => {
  setStorageItemWithLog(STORAGE_CREDIT_NAME_KEY, value)
})

watch(avatarUrl, (value) => {
  setStorageItemWithLog(STORAGE_AVATAR_URL_KEY, value)
})

watch(showCredit, (value) => {
  setStorageItemWithLog(STORAGE_SHOW_CREDIT_KEY, String(value))
})

watch(blurLevel, (value) => {
  setStorageItemWithLog(STORAGE_BLUR_LEVEL_KEY, String(value))
})

watch(exportRatio, (value) => {
  setStorageItemWithLog(STORAGE_EXPORT_RATIO_KEY, value)
})

watch(frameTheme, (value) => {
  setStorageItemWithLog(STORAGE_FRAME_THEME_KEY, value)
})

watch(titleAlign, (value) => {
  setStorageItemWithLog(STORAGE_TITLE_ALIGN_KEY, value)
})

watch(viewState, (value) => {
  if (value !== 'result') {
    isMobilePanelOpen.value = false
  }
})

onUnmounted(() => {
  if (avatarUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarUrl.value)
  }
})

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
  const centerY = y + contentHeight / 2
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

function getExportFileName(): string {
  const safeTitle =
    (albumData.value?.title || 'album').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'album'
  return `${safeTitle}_${exportRatio.value.replace(':', 'x')}.png`
}

async function getSnapdom() {
  if (!snapdomLib) {
    snapdomLib = await import('@zumer/snapdom')
  }
  return snapdomLib.snapdom
}

async function generateAndDownloadImage() {
  if (!albumData.value || !phoneFrameRef.value || !resultScreenRef.value || exporting.value) return
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
    const frameAspect = frameRect.width / frameRect.height
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
    // Determine capture scale by target height, then draw 1:1 with captured pixels (no secondary stretch).
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

    // Draw captured phone frame as-is to keep page layering behavior.
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
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1))
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatYear(releaseDate: string): string {
  const date = new Date(releaseDate)
  if (Number.isNaN(date.getTime())) return releaseDate.slice(0, 4) || m.label_unknown()
  return String(date.getFullYear())
}

const coverUrl = computed(() => albumData.value?.cover_url ?? '')
const platformAccentColor = computed(() =>
  albumData.value?.platform === 'AppleMusic' ? '#ff4e6b' : '#1ed760',
)
const resolvedAccentColor = computed(() => customAccentColor.value || platformAccentColor.value)
const titleAlignClass = computed(() => {
  if (titleAlign.value === 'center') return 'text-center'
  if (titleAlign.value === 'right') return 'text-right'
  return 'text-left'
})
const resultScreenThemeClass = computed(() =>
  frameTheme.value === 'light'
    ? 'bg-[#f6f7f9] text-[#101114]'
    : 'bg-surface-dim text-on-surface',
)
const resultOverlayClass = computed(() =>
  frameTheme.value === 'light'
    ? 'absolute inset-x-0 top-0 h-[220%] bg-gradient-to-b from-white/20 via-[#f6f7f9]/78 to-[#f6f7f9]'
    : 'absolute inset-x-0 top-0 h-[220%] bg-gradient-to-b from-surface-dim/20 via-surface-dim/80 to-surface-dim',
)
const resultMetaClass = computed(() =>
  frameTheme.value === 'light'
    ? 'text-sm font-medium text-black/55 font-headline max-md:text-xs'
    : 'text-sm font-medium text-on-surface-variant/60 font-headline max-md:text-xs',
)
const trackArtistClass = computed(() =>
  frameTheme.value === 'light' ? 'text-xs text-black/55' : 'text-xs text-on-surface-variant',
)
const trackDurationMutedClass = computed(() =>
  frameTheme.value === 'light'
    ? 'text-sm font-medium text-black/45 tabular-nums'
    : 'text-sm font-medium text-on-surface-variant/40 tabular-nums',
)
const trackHeartMutedClass = computed(() =>
  frameTheme.value === 'light'
    ? 'material-symbols-outlined text-black/30 text-xl transition-colors hover:text-black'
    : 'material-symbols-outlined text-on-surface-variant/20 text-xl transition-colors hover:text-white',
)
const trackTitleClass = computed(() =>
  frameTheme.value === 'light' ? 'font-semibold text-black overflow-hidden text-ellipsis whitespace-nowrap' : 'font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap',
)
const resultTitleClass = computed(() =>
  frameTheme.value === 'light'
    ? 'font-headline text-4xl font-extrabold tracking-tighter text-black leading-tight max-md:text-3xl'
    : 'font-headline text-4xl font-extrabold tracking-tighter text-white leading-tight max-md:text-3xl',
)
</script>

<template>
  <div
    class="relative grid w-full min-h-dvh place-items-center overflow-x-hidden"
    :class="
      viewState === 'input'
        ? 'bg-black'
        : 'bg-[radial-gradient(circle_at_20%_20%,rgb(255_140_147_/_25%),transparent_40%),radial-gradient(circle_at_80%_80%,rgb(114_254_143_/_18%),transparent_35%),#080808]'
    "
  >
    <div
      v-if="viewState === 'result' && albumData"
      class="absolute inset-0 z-0 bg-center bg-cover [transform:scale(1.12)]"
      :style="{ backgroundImage: `url(${coverUrl})`, filter: `blur(${blurLevel}px)` }"
    ></div>

    <div
      v-if="viewState === 'result' && albumData"
      class="absolute top-6 right-6 z-[60] hidden w-[280px] max-w-[calc(100vw-1rem)] flex-col gap-4 rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-xl md:flex select-none"
    >
      <div class="h-8 grid grid-cols-2 gap-0 rounded-lg bg-white/10">
        <button
          type="button"
          class="h-8 rounded-lg text-xs font-semibold text-white transition-colors"
          :class="locale === 'zh' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="changeLocale('zh')"
        >
          {{ m.locale_zh() }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
          :class="locale === 'en' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="changeLocale('en')"
        >
          {{ m.locale_en() }}
        </button>
      </div>
      <button
        type="button"
        class="flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        :aria-label="m.github_button_aria_label()"
        @click="openGithubRepo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M12 .297a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.84 2.83 1.31 3.52 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.46-1.33-5.46-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.48 11.48 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.24 1.91 1.24 3.22 0 4.62-2.8 5.64-5.47 5.93.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .297"
          />
        </svg>
        {{ m.github_button_label() }}
      </button>
      <button
        type="button"
        class="w-full h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        @click="handleBack"
      >
        {{ m.label_back() }}
      </button>

      <div>
        <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
          {{ m.label_blur() }}
        </div>
        <input v-model.number="blurLevel" class="w-full" type="range" min="0" max="40" step="1" />
      </div>

      <div>
        <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
          {{ m.label_export_ratio() }}
        </div>
        <div class="h-8 grid grid-cols-2 gap-1 rounded-lg bg-white/10">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="exportRatio === '3:4' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="exportRatio = '3:4'"
          >
            3:4
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="exportRatio === '9:16' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="exportRatio = '9:16'"
          >
            9:16
          </button>
        </div>
      </div>

      <div>
        <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
          {{ m.label_frame_theme() }}
        </div>
        <div class="h-8 grid grid-cols-2 gap-0 rounded-lg bg-white/10">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="frameTheme === 'dark' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="frameTheme = 'dark'"
          >
            {{ m.label_theme_dark() }}
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="frameTheme === 'light' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="frameTheme = 'light'"
          >
            {{ m.label_theme_light() }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div>
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
            {{ m.label_accent_color() }}
          </div>
          <div class="flex items-center gap-2">
            <input
              class="h-8 w-14 cursor-pointer rounded-lg border border-white/25 bg-transparent p-1"
              type="color"
              :value="resolvedAccentColor"
              @input="updateAccentColor"
            />
            <button
              type="button"
              class="flex-1 rounded-lg border border-white/20 bg-white/10 h-8 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              @click="resetAccentColor"
            >
              {{ m.label_reset_default() }}
            </button>
          </div>
        </div>

        <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
          {{ m.label_text_align() }}
        </div>
        <div class="h-8 grid grid-cols-3 gap-0 rounded-lg bg-white/10">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="titleAlign === 'left' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="titleAlign = 'left'"
          >
            {{ m.label_align_left() }}
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="titleAlign === 'center' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="titleAlign = 'center'"
          >
            {{ m.label_align_center() }}
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="titleAlign === 'right' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="titleAlign = 'right'"
          >
            {{ m.label_align_right() }}
          </button>
        </div>

        <div>
          <label
            class="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-white/75"
          >
            <span>{{ m.label_render_credit() }}</span>
            <input
              v-model="showCredit"
              class="h-4 w-4 cursor-pointer accent-white"
              type="checkbox"
            />
          </label>
        </div>

        <div v-show="showCredit">
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">{{ m.label_credit() }}</div>
          <input
            v-model="creditName"
            class="w-full h-8 rounded-lg border border-white/20 bg-black/35 px-2 text-xs text-white outline-none focus:border-white/35"
            type="text"
            maxlength="36"
            placeholder="@your_name"
          />
        </div>

        <div v-show="showCredit">
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">{{ m.label_avatar() }}</div>
          <div class="flex items-center gap-2">
            <input
              v-show="!avatarUrl"
              ref="avatarFileInputRef"
              class="block w-[70%] h-8 text-xs text-white cursor-pointer file:cursor-pointer file:h-8 file:mr-2 file:rounded-lg file:border file:border-white/20 file:bg-white/15 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
              type="file"
              accept="image/*"
              @change="handleAvatarUpload"
            />
            <img v-show="avatarUrl" :src="avatarUrl" alt="" class="w-8 h-8 rounded-lg object-cover" />
            <button
              type="button"
              class="w-[30%] h-8 ml-auto rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              :disabled="!avatarUrl"
              @click="clearAvatar"
            >
              {{ m.label_clear() }}
            </button>
          </div>
          <p v-if="avatarUrl" class="mt-1 text-[11px] font-medium text-white/55">{{ m.label_avatar_cached() }}</p>
        </div>
      </div>

      <button
        type="button"
        class="w-full h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="exporting"
        @click="generateAndDownloadImage"
      >
        {{ exporting ? m.label_generating() : m.label_generate_download() }}
      </button>
      <p v-if="exportError" class="mt-2 text-xs text-red-300">{{ exportError }}</p>
    </div>
    <button
      v-if="viewState === 'result' && albumData"
      type="button"
      class="fixed inset-x-3 bottom-3 z-[68] flex h-12 items-center justify-center rounded-xl border border-white/20 bg-black/65 px-4 text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:bg-black/75 md:hidden"
      :class="isMobilePanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'"
      @click="toggleMobilePanel"
    >
      {{ m.label_edit_export() }}
    </button>

    <div
      v-if="viewState === 'result' && albumData && isMobilePanelOpen"
      class="fixed inset-0 z-[69] bg-black/55 md:hidden"
      @click="closeMobilePanel"
    ></div>
    <div
      v-if="viewState === 'result' && albumData && isMobilePanelOpen"
      class="fixed inset-x-0 bottom-0 z-[70] overflow-hidden rounded-t-2xl border-t border-white/15 bg-black/78 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 backdrop-blur-xl md:hidden"
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          class="flex h-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          @click="closeMobilePanel"
        >
          {{ m.label_close() }}
        </button>
        <div class="grid grid-cols-2 rounded-lg bg-white/10">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="locale === 'zh' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="changeLocale('zh')"
          >
            {{ m.locale_zh() }}
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="locale === 'en' ? 'bg-white/25' : 'hover:bg-white/15'"
            @click="changeLocale('en')"
          >
            {{ m.locale_en() }}
          </button>
        </div>
      </div>
      <div class="max-h-[calc(78dvh-3.75rem)] overflow-y-auto pr-1 flex flex-col gap-3">
        <button
          type="button"
          class="flex w-full h-8 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          :aria-label="m.github_button_aria_label()"
          @click="openGithubRepo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M12 .297a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.84 2.83 1.31 3.52 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.46-1.33-5.46-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.48 11.48 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.24 1.91 1.24 3.22 0 4.62-2.8 5.64-5.47 5.93.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .297"
            />
          </svg>
          {{ m.github_button_label() }}
        </button>
        <button
          type="button"
          class="w-full h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          @click="handleBack"
        >
          {{ m.label_back() }}
        </button>

        <div>
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
            {{ m.label_blur() }}
          </div>
          <input v-model.number="blurLevel" class="w-full" type="range" min="0" max="40" step="1" />
        </div>

        <div>
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
            {{ m.label_export_ratio() }}
          </div>
          <div class="h-8 grid grid-cols-2 rounded-lg bg-white/10 overflow-hidden">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="exportRatio === '3:4' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="exportRatio = '3:4'"
            >
              3:4
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="exportRatio === '9:16' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="exportRatio = '9:16'"
            >
              9:16
            </button>
          </div>
        </div>

        <div>
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
            {{ m.label_frame_theme() }}
          </div>
          <div class="h-8 grid grid-cols-2 rounded-lg bg-white/10 overflow-hidden">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="frameTheme === 'dark' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="frameTheme = 'dark'"
            >
              {{ m.label_theme_dark() }}
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="frameTheme === 'light' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="frameTheme = 'light'"
            >
              {{ m.label_theme_light() }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
              {{ m.label_accent_color() }}
            </div>
            <div class="flex items-center gap-2">
              <input
                class="h-8 w-14 cursor-pointer rounded-lg border border-white/25 bg-transparent p-1"
                type="color"
                :value="resolvedAccentColor"
                @input="updateAccentColor"
              />
              <button
                type="button"
                class="flex-1 h-8 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                @click="resetAccentColor"
              >
                {{ m.label_reset_default() }}
              </button>
            </div>
          </div>

          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
            {{ m.label_text_align() }}
          </div>
          <div class="h-8 grid grid-cols-3 rounded-lg bg-white/10 overflow-hidden">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="titleAlign === 'left' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="titleAlign = 'left'"
            >
              {{ m.label_align_left() }}
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="titleAlign === 'center' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="titleAlign = 'center'"
            >
              {{ m.label_align_center() }}
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
              :class="titleAlign === 'right' ? 'bg-white/25' : 'hover:bg-white/15'"
              @click="titleAlign = 'right'"
            >
              {{ m.label_align_right() }}
            </button>
          </div>

          <div>
            <label
              class="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-white/75"
            >
              <span>{{ m.label_render_credit() }}</span>
              <input
                v-model="showCredit"
                class="h-4 w-4 cursor-pointer accent-white"
                type="checkbox"
              />
            </label>
          </div>

          <div v-show="showCredit">
            <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">{{ m.label_credit() }}</div>
            <input
              v-model="creditName"
              class="w-full h-8 rounded-lg border border-white/20 bg-black/35 px-2 text-xs text-white outline-none focus:border-white/35"
              type="text"
              maxlength="36"
              placeholder="@your_name"
            />
          </div>

          <div v-show="showCredit">
            <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">{{ m.label_avatar() }}</div>
            <div class="flex items-center gap-2">
              <input
                v-show="!avatarUrl"
                ref="avatarFileInputRef"
                class="block w-[80%] text-xs text-white file:mr-2 file:rounded-md file:border-0 file:bg-white/15 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                type="file"
                accept="image/*"
                @change="handleAvatarUpload"
              />
              <img v-show="avatarUrl" class="w-8 h-8 rounded-full object-cover" :src="avatarUrl" />
              <button
                type="button"
                class="flex-1 h-8 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                :disabled="!avatarUrl"
                @click="clearAvatar"
              >
                {{ m.label_clear() }}
              </button>
            </div>
            <!-- <p v-if="avatarUrl" class="mt-1 text-[11px] font-medium text-white/55">{{ m.label_avatar_cached() }}</p> -->
          </div>
        </div>

        <button
          type="button"
          class="w-full h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="exporting"
          @click="generateAndDownloadImage"
        >
          {{ exporting ? m.label_generating() : m.label_generate_download() }}
        </button>
        <p v-if="exportError" class="mt-2 text-xs text-red-300">{{ exportError }}</p>
      </div>
    </div>

    <div
      ref="phoneFrameRef"
      class="relative z-[1] w-[min(430px,100%)] aspect-[9/19.5] overflow-hidden rounded-[36px] shadow-[0_30px_80px_rgb(0_0_0_/_70%)] max-md:w-[min(420px,100%-1rem)] max-md:rounded-[28px] select-none"
      :class="
        exportRenderMode
          ? 'bg-black shadow-[0_12px_36px_rgb(0_0_0_/_45%)]'
          : 'bg-transparent'
      "
    >
      <div
        v-if="viewState === 'input'"
        class="relative grid h-full w-full place-items-center overflow-hidden p-5 max-md:p-4"
      >
        <div
          class="pointer-events-none absolute -left-12 top-8 h-44 w-44 rounded-full bg-[#5ce0e6]/18 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -right-10 bottom-12 h-40 w-40 rounded-full bg-[#a6b4ff]/16 blur-3xl"
        ></div>

        <div
          class="relative w-full rounded-[24px] border border-white/15 bg-[linear-gradient(180deg,rgb(255_255_255_/_10%),rgb(255_255_255_/_4%))] p-6 shadow-[0_16px_50px_rgb(0_0_0_/_45%)] backdrop-blur-[24px] max-md:rounded-[20px] max-md:p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              class="h-6 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              :aria-label="m.github_button_aria_label()"
              @click="openGithubRepo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  d="M12 .297a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.84 2.83 1.31 3.52 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.46-1.33-5.46-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.48 11.48 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.24 1.91 1.24 3.22 0 4.62-2.8 5.64-5.47 5.93.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .297"
                />
              </svg>
              {{ m.github_button_label() }}
            </button>
            <div class="grid grid-cols-2 rounded-lg bg-white/10">
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
                :class="locale === 'zh' ? 'bg-white/25' : 'hover:bg-white/15'"
                @click="changeLocale('zh')"
              >
                {{ m.locale_zh() }}
              </button>
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
                :class="locale === 'en' ? 'bg-white/25' : 'hover:bg-white/15'"
                @click="changeLocale('en')"
              >
                {{ m.locale_en() }}
              </button>
            </div>
          </div>
          <div class="mb-5 pb-4 max-md:mb-4 max-md:pb-3">
            <!-- <p class="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">Music Editor Shot</p> -->
            <h1
              class="m-0 mt-2 font-headline text-[34px] leading-[1.02] font-extrabold text-white max-md:text-[28px]"
            >
              {{ m.app_title() }}
            </h1>
            <p class="m-0 mt-2 text-[13px] leading-5 text-white/80 max-md:text-xs">
              {{ m.input_subtitle() }}
            </p>
          </div>

          <div>
            <!-- <label class="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-white/78" for="album-url">
              Album URL
            </label> -->
            <input
              id="album-url"
              v-model="inputUrl"
              class="h-12 w-full rounded-2xl border border-white/22 bg-black/35 px-4 text-sm text-white outline-none transition-all placeholder:text-white/45 max-md:h-11"
              type="url"
              :placeholder="m.input_placeholder()"
              :disabled="loading"
              @keydown.enter.prevent="handleSubmit"
            />

            <p
              v-if="errorMsg"
              class="mt-2 rounded-lg border border-error/45 bg-error/10 px-2.5 py-1.5 text-[12px] font-medium text-red-300"
            >
              {{ errorMsg }}
            </p>

            <button
              class="mt-3 h-12 w-full cursor-pointer rounded-2xl bg-white font-headline text-[15px] font-extrabold tracking-[0.02em] text-[#041017] transition-all active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              :disabled="loading"
              @click="handleSubmit"
            >
              {{ loading ? m.input_parsing() : m.input_submit() }}
            </button>
          </div>

          <div
            class="mt-4 flex flex-wrap items-center gap-2 pt-4 max-md:mt-3 max-md:pt-3"
          >
            <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50"
              >{{ m.label_supported_platforms() }}</span
            >
            <span
              class="inline-flex items-center rounded-full bg-[#1ed760] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              Spotify
            </span>
            <span
              class="inline-flex items-center rounded-full bg-[#ff4e6b] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              Apple Music
            </span>
          </div>
        </div>
      </div>

      <div
        v-else-if="albumData"
        ref="resultScreenRef"
        class="relative h-full w-full overflow-x-hidden overflow-y-auto font-body [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        :class="[
          resultScreenThemeClass,
          exportRenderMode ? '[&_*]:transition-none' : '',
        ]"
      >
        <div v-if="!exportRenderMode" class="absolute inset-0 z-0 pointer-events-none">
          <img
            class="w-full h-full object-cover opacity-40 scale-110 blur-3xl"
            :src="coverUrl"
            :alt="`${albumData.title} cover`"
          />
          <div :class="resultOverlayClass"></div>
        </div>

        <main class="relative z-10 mx-auto max-w-lg px-6 pb-12 pt-12 max-md:px-4 max-md:pb-24 max-md:pt-8">
          <section class="flex flex-col items-center mb-6">
            <div class="relative group mb-6 w-full px-6 max-md:mb-4 max-md:px-3">
              <img
                class="relative z-10 h-auto w-full rounded-lg object-cover shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                :src="coverUrl"
                :alt="`${albumData.title} artwork`"
              />
            </div>

            <div class="w-full space-y-1" :class="titleAlignClass">
              <h2 :class="resultTitleClass">
                {{ albumData.title }}
              </h2>
              <p class="text-xl font-medium font-headline max-md:text-lg" :style="{ color: resolvedAccentColor }">
                {{ albumData.artist }}
              </p>
              <p
                v-if="
                  albumData.platform === 'AppleMusic' && (albumData.genre || albumData.release_date)
                "
                :class="resultMetaClass"
              >
                {{ albumData.genre || m.label_unknown() }} 
                <span class="mx-1">·</span>
                {{ formatYear(albumData.release_date) }}
                <span class="mx-1">·</span>
                <img class="h-3 mx-1 inline" src="@/assets/Apple_Lossless_logo.png" /> {{ m.lossless() }}
              </p>
            </div>

            <div class="mt-6 flex w-full h-14 gap-0 rounded-full bg-black max-md:mt-4">
              <button
                class="flex h-[calc(100%+2px)] flex-1 items-center justify-center gap-2 rounded-full border-0 bg-white text-black font-headline font-bold outline-none transition-opacity max-md:text-sm translate-x-[-1px] translate-y-[-1px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                  <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                </svg>
                {{ m.player_play() }}
              </button>
              <button
                class="h-14 w-[47%] flex items-center justify-center gap-2 rounded-r-full border-0 bg-black text-white font-headline font-bold transition-opacity outline-none max-md:text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle-icon lucide-shuffle size-6">
                  <path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>
                </svg>
                {{ m.player_shuffle() }}
              </button>
            </div>
          </section>

          <section class="space-y-1">
            <!-- <h3 class="text-xs font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] mb-4 ml-1">
              Featured Tracks
            </h3> -->

            <template
              v-for="(track, index) in albumData.tracks"
              :key="`${track.track_number}-${track.name}`"
            >
              <div
                v-if="index === 0"
                class="group flex items-center gap-5 p-4 rounded-xl bg-white/5 transition-all max-md:gap-3 max-md:p-3"
              >
                <div class="w-6 text-center">
                  <div class="flex items-end justify-center gap-0.5 h-4">
                    <div
                      class="w-1 rounded-full h-full"
                      :style="{ backgroundColor: resolvedAccentColor }"
                    ></div>
                    <div
                      class="w-1 rounded-full h-2"
                      :style="{ backgroundColor: resolvedAccentColor }"
                    ></div>
                    <div
                      class="w-1 rounded-full h-3"
                      :style="{ backgroundColor: resolvedAccentColor }"
                    ></div>
                  </div>
                </div>
                <div class="w-[60%]">
                  <p class="font-semibold" :style="{ color: resolvedAccentColor }">
                    {{ track.name }}
                  </p>
                  <p :class="trackArtistClass">{{ track.artist }}</p>
                </div>
                <div class="flex items-center gap-4">
                  <span
                    class="material-symbols-outlined text-lg [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]"
                    :style="{ color: resolvedAccentColor }"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
                      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                    </svg>
                  </span>
                  <span
                    class="text-sm font-medium tabular-nums"
                    :style="{ color: resolvedAccentColor }"
                    >{{ formatDuration(track.duration_s) }}</span
                  >
                </div>
              </div>

              <div
                v-else
                class="group flex items-center gap-5 p-4 rounded-xl hover:bg-white/5 transition-all max-md:gap-3 max-md:p-3"
              >
                <span
                  class="w-6 text-center text-sm font-medium text-on-surface-variant/80 tabular-nums group-hover:hidden"
                >
                  {{ String(track.track_number).padStart(2, '0') }}
                </span>
                <span
                  class="w-6 text-center hidden group-hover:block"
                  :style="{ color: resolvedAccentColor }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
                    <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                  </svg>
                </span>
                <div class="w-[60%]">
                  <p :class="trackTitleClass">{{ track.name }}</p>
                  <p :class="trackArtistClass">{{ track.artist }}</p>
                </div>
                <div class="flex items-center gap-4">
                  <span :class="trackHeartMutedClass">favorite</span>
                  <span :class="trackDurationMutedClass">{{
                    formatDuration(track.duration_s)
                  }}</span>
                </div>
              </div>
            </template>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<style>
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2')
    format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.woff2')
    format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.woff2')
    format('woff2');
}

@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/manrope@latest/latin-700-normal.woff2')
    format('woff2');
}

@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/manrope@latest/latin-800-normal.woff2')
    format('woff2');
}

@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url('https://cdn.jsdelivr.net/fontsource/fonts/material-symbols-outlined:vf@latest/latin-wght-normal.woff2')
    format('woff2-variations');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
</style>
