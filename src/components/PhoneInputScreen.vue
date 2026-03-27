<script setup lang="ts">
import { m } from '../paraglide/messages'
import GithubRepoButton from './GithubRepoButton.vue'

const props = defineProps<{
  locale: 'en' | 'zh'
  inputUrl: string
  loading: boolean
  errorMsg: string
  changeLocale: (next: 'en' | 'zh') => void
  openGithubRepo: () => void
  handleSubmit: () => void
}>()

const emit = defineEmits<{
  updateInputUrl: [value: string]
}>()

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('updateInputUrl', value)
}
</script>

<template>
  <div class="relative grid h-full w-full place-items-center overflow-hidden p-5 max-md:p-4">
    <div
      class="pointer-events-none absolute -left-12 top-8 h-44 w-44 rounded-full bg-[#5ce0e6]/18 blur-3xl"
      aria-hidden="true"
      data-ai-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute -right-10 bottom-12 h-40 w-40 rounded-full bg-[#a6b4ff]/16 blur-3xl"
      aria-hidden="true"
      data-ai-hidden="true"
    ></div>

    <div
      class="relative w-full rounded-[24px] border border-white/15 bg-[linear-gradient(180deg,rgb(255_255_255_/_10%),rgb(255_255_255_/_4%))] p-6 shadow-[0_16px_50px_rgb(0_0_0_/_45%)] backdrop-blur-[24px] max-md:rounded-[20px] max-md:p-4"
    >
      <div class="mb-2 flex items-center justify-between gap-1">
        <GithubRepoButton
          :on-click="props.openGithubRepo"
          test-id="open-github-input"
          class-name="h-6 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          icon-class-name="h-3.5 w-3.5"
        />
        <div class="grid grid-cols-2 rounded-lg bg-white/10">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="props.locale === 'zh' ? 'bg-white/25' : 'hover:bg-white/15'"
            data-testid="locale-zh-input"
            data-ai-action="set-locale-zh"
            @click="props.changeLocale('zh')"
          >
            {{ m.locale_zh() }}
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-semibold text-white transition-colors"
            :class="props.locale === 'en' ? 'bg-white/25' : 'hover:bg-white/15'"
            data-testid="locale-en-input"
            data-ai-action="set-locale-en"
            @click="props.changeLocale('en')"
          >
            {{ m.locale_en() }}
          </button>
        </div>
      </div>
      <div class="mb-5 pb-4 max-md:mb-4 max-md:pb-3">
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
        <label class="sr-only" for="album-url">Album URL</label>
        <input
          id="album-url"
          :value="props.inputUrl"
          class="h-12 w-full rounded-2xl border border-white/22 bg-black/35 px-4 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors placeholder:text-white/45 max-md:h-11"
          type="url"
          name="album-url"
          autocomplete="off"
          :placeholder="m.input_placeholder()"
          :disabled="props.loading"
          :aria-invalid="!!props.errorMsg"
          :aria-describedby="props.errorMsg ? 'album-url-error' : undefined"
          data-testid="album-url-input"
          data-ai-action="input-album-url"
          @input="onInput"
          @keydown.enter.prevent="props.handleSubmit"
        />

        <p
          v-if="props.errorMsg"
          id="album-url-error"
          role="alert"
          class="mt-2 rounded-lg border border-error/45 bg-error/10 px-2.5 py-1.5 text-[12px] font-medium text-red-300"
        >
          {{ props.errorMsg }}
        </p>

        <button
          class="mt-3 h-12 w-full cursor-pointer rounded-2xl bg-white font-headline text-[15px] font-extrabold tracking-[0.02em] text-[#041017] transition-[transform,opacity,background-color,color] active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="props.loading"
          data-testid="parse-album-url"
          data-ai-action="parse-album-url"
          @click="props.handleSubmit"
        >
          {{ props.loading ? m.input_parsing() : m.input_submit() }}
        </button>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2 pt-4 max-md:mt-3 max-md:pt-3">
        <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">{{
          m.label_supported_platforms()
        }}</span>
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
</template>
