<script setup lang="ts">
import { computed, type VNodeRef } from 'vue'
import { m } from './paraglide/messages'
import { useAlbumParser } from './composables/useAlbumParser'
import { useAppSettings } from './composables/useAppSettings'
import { useImageExport } from './composables/useImageExport'
import PhoneInputScreen from './components/PhoneInputScreen.vue'
import PhoneResultScreen from './components/PhoneResultScreen.vue'
import DesktopControlPanel from './components/DesktopControlPanel.vue'
import MobileControlPanel from './components/MobileControlPanel.vue'

const {
  viewState,
  inputUrl,
  loading,
  errorMsg,
  albumData,
  handleSubmit: submitAlbum,
  handleBack,
} = useAlbumParser()

const {
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
} = useAppSettings(viewState)

const coverUrl = computed(() => albumData.value?.cover_url ?? '')

const {
  phoneFrameRef,
  resultScreenRef,
  exporting,
  exportError,
  exportRenderMode,
  generateAndDownloadImage,
} = useImageExport({
  albumData,
  exportRatio,
  blurLevel,
  showCredit,
  creditName,
  avatarUrl,
  coverUrl,
})

async function handleSubmit() {
  await submitAlbum(() => {
    customAccentColor.value = ''
  })
}

function updateInputUrl(value: string) {
  inputUrl.value = value
}
function setBlurLevel(value: number) {
  blurLevel.value = value
}
function setExportRatio(value: '3:4' | '9:16') {
  exportRatio.value = value
}
function setFrameTheme(value: 'dark' | 'light') {
  frameTheme.value = value
}
function setTitleAlign(value: 'left' | 'center' | 'right') {
  titleAlign.value = value
}
function setShowCredit(value: boolean) {
  showCredit.value = value
}
function setCreditName(value: string) {
  creditName.value = value
}
const setAvatarFileInputRef: VNodeRef = (refValue) => {
  avatarFileInputRef.value = (refValue as HTMLInputElement | null) ?? null
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
  frameTheme.value === 'light' ? 'bg-[#f6f7f9] text-[#101114]' : 'bg-surface-dim text-on-surface',
)
const resultOverlayClass = computed(() =>
  frameTheme.value === 'light'
    ? 'absolute inset-x-0 top-0 bg-gradient-to-b from-white via-white/80 to-white/20'
    : 'absolute inset-x-0 top-0 bg-gradient-to-b from-surface-dim/20 via-surface-dim/80 to-surface-dim',
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
  frameTheme.value === 'light'
    ? 'font-semibold text-black overflow-hidden text-ellipsis whitespace-nowrap'
    : 'font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap',
)
const resultTitleClass = computed(() =>
  frameTheme.value === 'light'
    ? 'font-headline text-4xl font-extrabold tracking-tighter text-black leading-tight max-md:text-3xl'
    : 'font-headline text-4xl font-extrabold tracking-tighter text-white leading-tight max-md:text-3xl',
)
</script>

<template>
  <div
    class="relative grid h-dvh w-full place-items-center overflow-hidden"
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

    <DesktopControlPanel
      v-if="viewState === 'result' && albumData"
      :locale="locale"
      :blur-level="blurLevel"
      :export-ratio="exportRatio"
      :frame-theme="frameTheme"
      :resolved-accent-color="resolvedAccentColor"
      :title-align="titleAlign"
      :show-credit="showCredit"
      :credit-name="creditName"
      :avatar-url="avatarUrl"
      :avatar-file-input-ref="setAvatarFileInputRef"
      :exporting="exporting"
      :export-error="exportError"
      :change-locale="changeLocale"
      :open-github-repo="openGithubRepo"
      :handle-back="handleBack"
      :update-accent-color="updateAccentColor"
      :reset-accent-color="resetAccentColor"
      :handle-avatar-upload="handleAvatarUpload"
      :clear-avatar="clearAvatar"
      :generate-and-download-image="generateAndDownloadImage"
      :set-blur-level="setBlurLevel"
      :set-export-ratio="setExportRatio"
      :set-frame-theme="setFrameTheme"
      :set-title-align="setTitleAlign"
      :set-show-credit="setShowCredit"
      :set-credit-name="setCreditName"
    />

    <MobileControlPanel
      v-if="viewState === 'result' && albumData"
      :is-open="isMobilePanelOpen"
      :locale="locale"
      :blur-level="blurLevel"
      :export-ratio="exportRatio"
      :frame-theme="frameTheme"
      :resolved-accent-color="resolvedAccentColor"
      :title-align="titleAlign"
      :show-credit="showCredit"
      :credit-name="creditName"
      :avatar-url="avatarUrl"
      :avatar-file-input-ref="setAvatarFileInputRef"
      :exporting="exporting"
      :export-error="exportError"
      :change-locale="changeLocale"
      :open-github-repo="openGithubRepo"
      :handle-back="handleBack"
      :update-accent-color="updateAccentColor"
      :reset-accent-color="resetAccentColor"
      :handle-avatar-upload="handleAvatarUpload"
      :clear-avatar="clearAvatar"
      :generate-and-download-image="generateAndDownloadImage"
      :toggle-open="toggleMobilePanel"
      :close-panel="closeMobilePanel"
      :set-blur-level="setBlurLevel"
      :set-export-ratio="setExportRatio"
      :set-frame-theme="setFrameTheme"
      :set-title-align="setTitleAlign"
      :set-show-credit="setShowCredit"
      :set-credit-name="setCreditName"
    />

    <div
      ref="phoneFrameRef"
      class="relative z-[1] w-[min(430px,100%)] aspect-[9/19.5] overflow-hidden rounded-[36px] bg-transparent shadow-[0_30px_80px_rgb(0_0_0_/_70%)] max-md:w-[min(420px,100%-1rem)] max-md:rounded-[28px] select-none"
    >
      <PhoneInputScreen
        v-if="viewState === 'input'"
        :locale="locale"
        :input-url="inputUrl"
        :loading="loading"
        :error-msg="errorMsg"
        :change-locale="changeLocale"
        :open-github-repo="openGithubRepo"
        :handle-submit="handleSubmit"
        @update-input-url="updateInputUrl"
      />

      <PhoneResultScreen
        v-else-if="albumData"
        :result-screen-ref="(el) => (resultScreenRef = (el as HTMLElement | null) ?? null)"
        :album-data="albumData"
        :cover-url="coverUrl"
        :export-render-mode="exportRenderMode"
        :result-screen-theme-class="resultScreenThemeClass"
        :result-overlay-class="resultOverlayClass"
        :title-align-class="titleAlignClass"
        :result-title-class="resultTitleClass"
        :resolved-accent-color="resolvedAccentColor"
        :result-meta-class="resultMetaClass"
        :track-artist-class="trackArtistClass"
        :track-title-class="trackTitleClass"
        :track-heart-muted-class="trackHeartMutedClass"
        :track-duration-muted-class="trackDurationMutedClass"
        :format-year="formatYear"
        :format-duration="formatDuration"
      />
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
