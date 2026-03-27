<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type VNodeRef } from 'vue'
import type { AlbumData } from '../service'
import { m } from '../paraglide/messages'

const props = defineProps<{
  resultScreenRef: VNodeRef
  albumData: AlbumData
  coverUrl: string
  exportRenderMode: boolean
  resultScreenThemeClass: string
  resultOverlayClass: string
  titleAlignClass: string
  resultTitleClass: string
  resolvedAccentColor: string
  resultMetaClass: string
  trackArtistClass: string
  trackTitleClass: string
  trackHeartMutedClass: string
  trackDurationMutedClass: string
  formatYear: (releaseDate: string) => string
  formatDuration: (seconds: number) => string
}>()

const rootRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const overlayHeightPx = ref(0)

const overlayStyle = computed(() => {
  if (!overlayHeightPx.value) return { height: '100%' }
  return { height: `${overlayHeightPx.value}px` }
})

function syncOverlayHeight() {
  const root = rootRef.value
  const content = contentRef.value
  if (!root) return
  const contentHeight = Math.ceil(content?.scrollHeight ?? 0)
  const viewportHeight = Math.ceil(root.clientHeight)
  overlayHeightPx.value = Math.max(contentHeight, viewportHeight)
}

let resizeObserver: ResizeObserver | null = null

function setResultScreenRef(el: Element | { $el?: Element } | null, refs: Record<string, unknown>) {
  rootRef.value = el instanceof HTMLElement ? el : null
  const targetRef = props.resultScreenRef
  if (typeof targetRef === 'function') {
    targetRef(el as Element | null, refs)
    return
  }
  if (targetRef && typeof targetRef === 'object' && 'value' in targetRef) {
    ;(targetRef as { value: Element | { $el?: Element } | null }).value = el
  }
}

onMounted(() => {
  syncOverlayHeight()
  resizeObserver = new ResizeObserver(() => {
    syncOverlayHeight()
  })
  if (rootRef.value) resizeObserver.observe(rootRef.value)
  if (contentRef.value) resizeObserver.observe(contentRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    :ref="setResultScreenRef"
    class="relative h-full w-full overflow-x-hidden overflow-y-auto font-body [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    :class="[props.resultScreenThemeClass, props.exportRenderMode ? '[&_*]:transition-none' : '']"
  >
    <div class="absolute inset-0 z-0 pointer-events-none">
      <img
        class="w-full h-full object-cover opacity-40 scale-110 blur-3xl"
        :src="props.coverUrl"
        :alt="`${props.albumData.title} cover`"
        width="1000"
        height="1000"
      />
      <div :class="props.resultOverlayClass" :style="overlayStyle"></div>
    </div>

    <main
      ref="contentRef"
      class="relative z-10 mx-auto max-w-lg px-5 py-10 max-md:px-4 max-md:pb-24 max-md:pt-8"
    >
      <section class="flex flex-col items-center mb-6">
        <div class="relative group mb-5 w-full px-5 max-md:mb-4 max-md:px-3">
          <img
            class="relative z-10 h-auto w-full rounded-lg object-cover shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
            :src="props.coverUrl"
            :alt="`${props.albumData.title} artwork`"
            width="1000"
            height="1000"
          />
        </div>

        <div class="w-full space-y-1" :class="props.titleAlignClass">
          <h2 :class="props.resultTitleClass">
            {{ props.albumData.title }}
          </h2>
          <p
            class="text-xl font-medium font-headline max-md:text-lg"
            :style="{ color: props.resolvedAccentColor }"
          >
            {{ props.albumData.artist }}
          </p>
          <p
            v-if="
              props.albumData.platform === 'AppleMusic' &&
              (props.albumData.genre || props.albumData.release_date)
            "
            :class="props.resultMetaClass"
          >
            {{ props.albumData.genre || m.label_unknown() }}
            <span class="mx-1">·</span>
            {{ props.formatYear(props.albumData.release_date) }}
            <span class="mx-1">·</span>
            <img
              class="h-3 mx-1 inline"
              src="@/assets/Apple_Lossless_logo.png"
              alt=""
              aria-hidden="true"
              data-ai-hidden="true"
              width="24"
              height="12"
            />
            {{ m.lossless() }}
          </p>
        </div>

        <div class="mt-6 flex w-full h-14 gap-0 rounded-full bg-black max-md:mt-4">
          <button
            type="button"
            class="flex h-[calc(100%+2px)] flex-1 items-center justify-center gap-2 rounded-full border-0 bg-white text-black font-headline font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 transition-opacity max-md:text-sm translate-x-[-1px] translate-y-[-1px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="size-6"
            >
              <path
                fill-rule="evenodd"
                d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                clip-rule="evenodd"
              />
            </svg>
            {{ m.player_play() }}
          </button>
          <button
            type="button"
            class="h-14 w-[47%] flex items-center justify-center gap-2 rounded-r-full border-0 bg-black text-white font-headline font-bold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 max-md:text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-shuffle-icon lucide-shuffle size-6"
            >
              <path d="m18 14 4 4-4 4" />
              <path d="m18 2 4 4-4 4" />
              <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
              <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
              <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
            </svg>
            {{ m.player_shuffle() }}
          </button>
        </div>
      </section>

      <section class="space-y-1">
        <template
          v-for="(track, index) in props.albumData.tracks"
          :key="`${track.track_number}-${track.name}`"
        >
          <div
            v-if="index === 0"
            class="w-full group flex items-center gap-5 p-4 rounded-xl bg-white/5 transition-colors max-md:gap-3 max-md:p-3"
          >
            <div class="w-6 text-center">
              <div class="flex items-end justify-center gap-0.5 h-4">
                <div
                  class="w-1 rounded-full h-full"
                  :style="{ backgroundColor: props.resolvedAccentColor }"
                ></div>
                <div
                  class="w-1 rounded-full h-2"
                  :style="{ backgroundColor: props.resolvedAccentColor }"
                ></div>
                <div
                  class="w-1 rounded-full h-3"
                  :style="{ backgroundColor: props.resolvedAccentColor }"
                ></div>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap" :style="{ color: props.resolvedAccentColor }">
                {{ track.name }}
              </p>
              <p :class="props.trackArtistClass">{{ track.artist }}</p>
            </div>
            <div class="flex items-center gap-4 ml-auto">
              <!-- <span
                class="material-symbols-outlined text-lg [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]"
                :style="{ color: props.resolvedAccentColor }"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="size-5"
                >
                  <path
                    d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
                  />
                </svg>
              </span> -->
              <span
                class="text-sm font-medium tabular-nums"
                :style="{ color: props.resolvedAccentColor }"
                >{{ props.formatDuration(track.duration_s) }}</span
              >
            </div>
          </div>

          <div
            v-else
            class="w-full group flex items-center gap-5 p-4 rounded-xl hover:bg-white/5 transition-colors max-md:gap-3 max-md:p-3"
          >
            <span
              class="w-6 text-center text-sm font-medium text-on-surface-variant/80 tabular-nums group-hover:hidden"
              aria-hidden="true"
            >
              {{ String(track.track_number).padStart(2, '0') }}
            </span>
            <span class="sr-only">Track {{ String(track.track_number).padStart(2, '0') }}</span>
            <span
              class="w-6 text-center hidden group-hover:block"
              :style="{ color: props.resolvedAccentColor }"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="size-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
            <div class="flex-1 min-w-0">
              <p :class="props.trackTitleClass">{{ track.name }}</p>
              <p :class="props.trackArtistClass">{{ track.artist }}</p>
            </div>
            <div class="flex items-center gap-4 ml-auto">
              <!-- <span :class="props.trackHeartMutedClass">favorite</span> -->
              <span :class="props.trackDurationMutedClass">{{
                props.formatDuration(track.duration_s)
              }}</span>
            </div>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
