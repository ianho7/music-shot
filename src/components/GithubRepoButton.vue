<script setup lang="ts">
import { m } from '../paraglide/messages'

const props = defineProps<{
  onClick: () => void
  className?: string
  iconClassName?: string
  testId?: string
}>()
</script>

<template>
  <button
    type="button"
    :class="
      props.className ||
      'flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
    "
    :aria-label="m.github_button_aria_label()"
    :data-testid="props.testId || 'open-github'"
    data-ai-action="open-github-new-tab"
    @click="props.onClick"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      :class="props.iconClassName || 'h-4 w-4'"
      aria-hidden="true"
    >
      <path
        d="M12 .297a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.84 2.83 1.31 3.52 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.46-1.33-5.46-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.48 11.48 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.24 1.91 1.24 3.22 0 4.62-2.8 5.64-5.47 5.93.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .297"
      />
    </svg>
    {{ m.github_button_label() }}
    <span class="sr-only">(opens in new tab)</span>
  </button>
</template>
