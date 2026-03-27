import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { getLocale, setLocale } from '../paraglide/runtime'
import { m } from '../paraglide/messages'

export type TextAlignMode = 'left' | 'center' | 'right'
export type ExportRatio = '3:4' | '9:16'
export type FrameTheme = 'dark' | 'light'

const STORAGE_CREDIT_NAME_KEY = 'music-shot:credit-name'
const STORAGE_AVATAR_URL_KEY = 'music-shot:avatar-url'
const STORAGE_SHOW_CREDIT_KEY = 'music-shot:show-credit'
const STORAGE_LOCALE_KEY = 'music-shot:locale'
const STORAGE_BLUR_LEVEL_KEY = 'music-shot:blur-level'
const STORAGE_EXPORT_RATIO_KEY = 'music-shot:export-ratio'
const STORAGE_FRAME_THEME_KEY = 'music-shot:frame-theme'
const STORAGE_TITLE_ALIGN_KEY = 'music-shot:title-align'
const STORAGE_DEBUG_PREFIX = '[credit-storage]'

export const GITHUB_REPO_URL = 'https://github.com/ianho7/music-shot'

function detectBrowserLocale(): 'en' | 'zh' {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  const normalized = (langs[0] || '').toLowerCase()
  return normalized.startsWith('zh') ? 'zh' : 'en'
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

export function useAppSettings(viewState: Ref<'input' | 'result'>) {
  const blurLevel = ref(20)
  const titleAlign = ref<TextAlignMode>('center')
  const exportRatio = ref<ExportRatio>('3:4')
  const frameTheme = ref<FrameTheme>('dark')
  const customAccentColor = ref('')
  const creditName = ref('@your_name')
  const avatarUrl = ref('')
  const avatarFileInputRef = ref<HTMLInputElement | null>(null)
  const showCredit = ref(true)
  const isMobilePanelOpen = ref(false)
  const locale = ref<'en' | 'zh'>('en')

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
    } catch {
      console.error(`${STORAGE_DEBUG_PREFIX} mounted-read-failed`)
    }
  })

  watch(creditName, (value) => setStorageItemWithLog(STORAGE_CREDIT_NAME_KEY, value))
  watch(avatarUrl, (value) => setStorageItemWithLog(STORAGE_AVATAR_URL_KEY, value))
  watch(showCredit, (value) => setStorageItemWithLog(STORAGE_SHOW_CREDIT_KEY, String(value)))
  watch(blurLevel, (value) => setStorageItemWithLog(STORAGE_BLUR_LEVEL_KEY, String(value)))
  watch(exportRatio, (value) => setStorageItemWithLog(STORAGE_EXPORT_RATIO_KEY, value))
  watch(frameTheme, (value) => setStorageItemWithLog(STORAGE_FRAME_THEME_KEY, value))
  watch(titleAlign, (value) => setStorageItemWithLog(STORAGE_TITLE_ALIGN_KEY, value))

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

  return {
    blurLevel,
    titleAlign,
    exportRatio,
    frameTheme,
    customAccentColor,
    creditName,
    avatarUrl,
    avatarFileInputRef,
    showCredit,
    isMobilePanelOpen,
    locale,
    changeLocale,
    openGithubRepo,
    toggleMobilePanel,
    closeMobilePanel,
    resetAccentColor,
    updateAccentColor,
    clearAvatar,
    handleAvatarUpload,
  }
}
