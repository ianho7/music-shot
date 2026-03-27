import { ref } from 'vue'
import type { AlbumData } from '../service'
import { MusicLinkParser } from '../service'
import { m } from '../paraglide/messages'

export type ViewState = 'input' | 'result'
type Platform = 'Spotify' | 'AppleMusic'

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

export function useAlbumParser() {
  const parser = new MusicLinkParser()

  const viewState = ref<ViewState>('input')
  const inputUrl = ref('')
  const loading = ref(false)
  const errorMsg = ref('')
  const albumData = ref<AlbumData | null>(null)

  async function handleSubmit(onSuccess?: () => void) {
    errorMsg.value = ''
    try {
      const { cleanedUrl } = detectAndValidateAlbumUrl(inputUrl.value)
      loading.value = true
      const result = await parser.parse(cleanedUrl)
      console.log(result)
      albumData.value = result
      viewState.value = 'result'
      onSuccess?.()
    } catch (error) {
      console.error('[handleSubmit] parse failed:', error)
      if (error instanceof Error) {
        console.error('[handleSubmit] stack:', error.stack)
        if (error.cause) {
          console.error('[handleSubmit] cause:', error.cause)
        }
      }
      errorMsg.value = (error as Error).message || m.error_parse_failed()
    } finally {
      loading.value = false
    }
  }

  function handleBack() {
    viewState.value = 'input'
    inputUrl.value = ''
  }

  return {
    viewState,
    inputUrl,
    loading,
    errorMsg,
    albumData,
    handleSubmit,
    handleBack,
  }
}
