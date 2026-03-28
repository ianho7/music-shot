<script setup lang="ts">
import { m } from '../paraglide/messages'
import type { ExportRatio, FrameTheme, TextAlignMode } from '../composables/useAppSettings'
import type { VNodeRef } from 'vue'
import GithubRepoButton from './GithubRepoButton.vue'
import ParticleBurst from './ParticleBurst.vue'

const props = defineProps<{
  locale: 'en' | 'zh'
  blurLevel: number
  exportRatio: ExportRatio
  frameTheme: FrameTheme
  resolvedAccentColor: string
  titleAlign: TextAlignMode
  showCredit: boolean
  creditName: string
  avatarUrl: string
  avatarFileInputRef: VNodeRef
  exporting: boolean
  exportError: string
  changeLocale: (next: 'en' | 'zh') => void
  openGithubRepo: () => void
  handleBack: () => void
  updateAccentColor: (event: Event) => void
  resetAccentColor: () => void
  handleAvatarUpload: (event: Event) => void
  clearAvatar: () => void
  generateAndDownloadImage: () => void
  setBlurLevel: (value: number) => void
  setExportRatio: (value: ExportRatio) => void
  setFrameTheme: (value: FrameTheme) => void
  setTitleAlign: (value: TextAlignMode) => void
  setShowCredit: (value: boolean) => void
  setCreditName: (value: string) => void
}>()

function onBlurInput(event: Event) {
  props.setBlurLevel(Number((event.target as HTMLInputElement).value || 0))
}
function onCreditNameInput(event: Event) {
  props.setCreditName((event.target as HTMLInputElement).value)
}
function onShowCreditChange(event: Event) {
  props.setShowCredit((event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div
    class="absolute top-6 right-6 z-[60] hidden w-[280px] max-w-[calc(100vw-1rem)] flex-col gap-4 rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-xl md:flex select-none"
  >
    <div class="h-8 grid grid-cols-2 gap-0 rounded-lg bg-white/10">
      <button
        type="button"
        class="h-8 rounded-lg text-xs font-semibold text-white transition-colors"
        :class="props.locale === 'zh' ? 'bg-white/25' : 'hover:bg-white/15'"
        data-testid="locale-zh-desktop"
        data-ai-action="set-locale-zh"
        @click="props.changeLocale('zh')"
      >
        {{ m.locale_zh() }}
      </button>
      <button
        type="button"
        class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
        :class="props.locale === 'en' ? 'bg-white/25' : 'hover:bg-white/15'"
        data-testid="locale-en-desktop"
        data-ai-action="set-locale-en"
        @click="props.changeLocale('en')"
      >
        {{ m.locale_en() }}
      </button>
    </div>

    <GithubRepoButton
      :on-click="props.openGithubRepo"
      test-id="open-github-desktop"
      class-name="flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      icon-class-name="h-4 w-4"
    />

    <button
      type="button"
      class="w-full h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
      @click="props.handleBack"
    >
      {{ m.label_back() }}
    </button>

    <div>
      <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
        {{ m.label_blur() }}
      </div>
      <input
        class="w-full"
        type="range"
        name="blur-level-desktop"
        :aria-label="m.label_blur()"
        min="0"
        max="40"
        step="1"
        :value="props.blurLevel"
        @input="onBlurInput"
      />
    </div>

    <div>
      <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
        {{ m.label_export_ratio() }}
      </div>
      <div class="h-8 grid grid-cols-2 gap-1 rounded-lg bg-white/10">
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
          :class="props.exportRatio === '3:4' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setExportRatio('3:4')"
        >
          3:4
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
          :class="props.exportRatio === '9:16' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setExportRatio('9:16')"
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
          :class="props.frameTheme === 'dark' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setFrameTheme('dark')"
        >
          {{ m.label_theme_dark() }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
          :class="props.frameTheme === 'light' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setFrameTheme('light')"
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
            name="accent-color-desktop"
            :aria-label="m.label_accent_color()"
            :value="props.resolvedAccentColor"
            @input="props.updateAccentColor"
          />
          <button
            type="button"
            class="flex-1 rounded-lg border border-white/20 bg-white/10 h-8 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            @click="props.resetAccentColor"
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
          :class="props.titleAlign === 'left' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setTitleAlign('left')"
        >
          {{ m.label_align_left() }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
          :class="props.titleAlign === 'center' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setTitleAlign('center')"
        >
          {{ m.label_align_center() }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
          :class="props.titleAlign === 'right' ? 'bg-white/25' : 'hover:bg-white/15'"
          @click="props.setTitleAlign('right')"
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
            class="h-4 w-4 cursor-pointer accent-white"
            type="checkbox"
            :checked="props.showCredit"
            @change="onShowCreditChange"
          />
        </label>
      </div>

      <div v-show="props.showCredit">
        <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
          {{ m.label_credit() }}
        </div>
        <input
          class="w-full h-8 rounded-lg border border-white/20 bg-black/35 px-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          type="text"
          name="credit-name-desktop"
          autocomplete="off"
          maxlength="36"
          placeholder="@your_name"
          :value="props.creditName"
          @input="onCreditNameInput"
        />
      </div>

      <div v-show="props.showCredit">
        <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">
          {{ m.label_avatar() }}
        </div>
        <div class="flex items-center gap-2">
          <input
            v-show="!props.avatarUrl"
            :ref="props.avatarFileInputRef"
            id="avatar-upload-desktop"
            class="block w-[70%] h-8 text-xs text-white cursor-pointer file:cursor-pointer file:h-8 file:mr-2 file:rounded-lg file:border file:border-white/20 file:bg-white/15 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
            type="file"
            name="avatar-upload-desktop"
            accept="image/*"
            :aria-label="m.label_avatar()"
            data-testid="avatar-upload-desktop"
            data-ai-action="upload-avatar"
            @change="props.handleAvatarUpload"
          />
          <img
            v-show="props.avatarUrl"
            :src="props.avatarUrl"
            alt=""
            width="32"
            height="32"
            class="w-8 h-8 rounded-lg object-cover"
          />
          <button
            type="button"
            class="w-[30%] h-8 ml-auto rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            :disabled="!props.avatarUrl"
            data-testid="clear-avatar-desktop"
            data-ai-action="clear-avatar"
            @click="props.clearAvatar"
          >
            {{ m.label_clear() }}
          </button>
        </div>
        <p v-if="props.avatarUrl" class="mt-1 text-[11px] font-medium text-white/55">
          {{ m.label_avatar_cached() }}
        </p>
      </div>
    </div>
    <ParticleBurst>
      <button
        type="button"
        class="w-full h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="props.exporting"
        data-testid="export-image-desktop"
        data-ai-action="export-image"
        @click="props.generateAndDownloadImage"
      >
        {{ props.exporting ? m.label_generating() : m.label_generate_download() }}
      </button>
    </ParticleBurst>
    <p v-if="props.exportError" class="mt-2 text-xs text-red-300">{{ props.exportError }}</p>
  </div>
</template>
