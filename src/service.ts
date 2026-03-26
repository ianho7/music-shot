/**
 * 统一的音乐数据接口
 */
import { m } from './paraglide/messages'

export interface Track {
  name: string
  artist: string
  duration_s: number // 秒
  track_number: number
}

export interface AlbumData {
  title: string
  artist: string
  genre?: string
  cover_url: string
  release_date: string
  tracks: Track[]
  platform: 'Spotify' | 'AppleMusic'
}

export class MusicLinkParser {
  // 使用 allorigins 公共代理 (生产环境建议换成自己的 Cloudflare Worker 代理)
  private readonly PROXY = 'https://music-shot-proxy.0v0.one/?url='

  /**
   * 核心入口：解析链接并返回数据
   */
  async parse(url: string): Promise<AlbumData> {
    if (url.includes('spotify.com')) {
      return this.parseSpotify(url)
    } else if (url.includes('apple.com')) {
      return this.parseAppleMusic(url)
    } else {
      throw new Error(m.error_unsupported_platform())
    }
  }

  /**
   * --- Spotify 邪修逻辑 ---
   * 原理：抓取 Spotify Embed 页面，解析隐藏在 <script> 里的 Base64 编码状态数据
   */
  private async parseSpotify(url: string): Promise<AlbumData> {
    const match = url.match(/album\/([a-zA-Z0-9]+)/)
    if (!match) throw new Error(m.error_invalid_spotify_url())

    const albumId = match[1]
    if (!albumId) throw new Error(m.error_invalid_spotify_url())
    const embedUrl = `https://open.spotify.com/embed/album/${albumId}`

    // 通过代理获取 HTML
    const response = await fetch(`${this.PROXY}${encodeURIComponent(embedUrl)}`)
    if (!response.ok) throw new Error(m.error_parse_failed())

    const rawResponse = await response.text()
    const html = this.extractHtmlFromProxyResponse(rawResponse)

    try {
      // 新版 Spotify Embed: Next.js 注入在 __NEXT_DATA__ 中
      const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
      )
      if (nextDataMatch) {
        const nextDataRaw = nextDataMatch[1]
        if (!nextDataRaw) {
          throw new Error(m.error_parse_failed())
        }
        const nextData = JSON.parse(nextDataRaw)
        const entity = nextData?.props?.pageProps?.state?.data?.entity
        if (!entity) {
          throw new Error(m.error_parse_failed())
        }

        const images = Array.isArray(entity.visualIdentity?.image)
          ? entity.visualIdentity.image
          : []
        const bestImage = images.reduce(
          (best: any, current: any) =>
            (current?.maxWidth ?? 0) > (best?.maxWidth ?? 0) ? current : best,
          images[0],
        )
        const tracks = Array.isArray(entity.trackList) ? entity.trackList : []

        return {
          title: entity.title || entity.name || '',
          artist: entity.subtitle || '',
          cover_url: bestImage?.url || '',
          release_date: entity.releaseDate?.isoString || '',
          platform: 'Spotify',
          tracks: tracks.map((t: any, i: number) => ({
            name: t.title || '',
            artist: t.subtitle || entity.subtitle || '',
            duration_s: Math.floor((t.duration ?? 0) / 1000),
            track_number: i + 1,
          })),
        }
      }

      // 老版 Spotify Embed 兜底: initial-state base64
      const initialStateMatch = html.match(
        /<script id="initial-state" type="text\/plain">([^<]+)<\/script>/,
      )
      if (!initialStateMatch) {
        throw new Error(m.error_parse_failed())
      }

      const initialState = initialStateMatch[1]
      if (!initialState) {
        throw new Error(m.error_parse_failed())
      }
      const decodedData = JSON.parse(atob(initialState))
      const albumEntity = decodedData.entities.items[`spotify:album:${albumId}`]
      if (!albumEntity) {
        throw new Error(m.error_parse_failed())
      }

      return {
        title: albumEntity.name,
        artist: albumEntity.artists[0].name,
        cover_url: albumEntity.images[0].url,
        release_date: albumEntity.release_date,
        platform: 'Spotify',
        tracks: albumEntity.tracks.items.map((t: any, i: number) => ({
          name: t.name,
          artist: t.artists.map((a: any) => a.name).join(', '),
          duration_s: Math.floor(t.duration_ms / 1000),
          track_number: i + 1,
        })),
      }
    } catch (e) {
      throw new Error(`${m.error_parse_failed()}: ${(e as Error).message}`)
    }
  }

  /**
   * 兼容不同代理返回：
   * 1) 直接返回 HTML 字符串
   * 2) 返回 JSON 包装（例如 { contents: "<html...>" }）
   */
  private extractHtmlFromProxyResponse(raw: string): string {
    const trimmed = raw.trim()
    if (!trimmed) throw new Error(m.error_parse_failed())

    // 直接 HTML
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return trimmed
    }

    // JSON 包装
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed?.contents === 'string' && parsed.contents.trim()) {
          return parsed.contents
        }
        if (typeof parsed?.data === 'string' && parsed.data.trim()) {
          return parsed.data
        }
      } catch {
        // Ignore and fall through to throw below.
      }
    }

    throw new Error(m.error_parse_failed())
  }

  /**
   * --- Apple Music 正道逻辑 ---
   * 原理：使用 iTunes Lookup API，这是官方预留的公开跨域接口
   */
  private async parseAppleMusic(url: string): Promise<AlbumData> {
    const match = url.match(/\/album\/.*\/(\d+)/)
    if (!match) throw new Error(m.error_invalid_apple_url())

    const albumId = match[1]
    // // 直接请求，无需代理（iTunes API 支持 CORS）
    // const res = await fetch(`https://itunes.apple.com/lookup?id=${albumId}&entity=song`)
    // const data = await res.json()
    // const results = Array.isArray(data?.results) ? data.results : []
    // if (results.length === 0) {
    //   throw new Error(m.error_parse_failed())
    // }

    const embedUrl = `https://itunes.apple.com/lookup?id=${albumId}&entity=song`

    // 通过代理获取 json
    const response = await fetch(`${this.PROXY}${encodeURIComponent(embedUrl)}`)
    if (!response.ok) throw new Error(m.error_parse_failed())

    const data = await response.json()
    const results = Array.isArray(data?.results) ? data.results : []
    if (results.length === 0) {
      throw new Error(m.error_parse_failed())
    }

    const albumInfo =
      results.find(
        (item: any) => item?.wrapperType === 'collection' && item?.collectionType === 'Album',
      ) ?? results[0]
    const trackList = results.filter(
      (item: any) => item?.wrapperType === 'track' && item?.kind === 'song',
    )
    const artworkUrl100 = albumInfo?.artworkUrl100 ?? ''
    const coverUrl = artworkUrl100 ? artworkUrl100.replace('100x100bb', '1000x1000bb') : ''

    return {
      title: albumInfo?.collectionName ?? '',
      artist: albumInfo?.artistName ?? '',
      genre: albumInfo?.primaryGenreName ?? '',
      cover_url: coverUrl,
      release_date: albumInfo?.releaseDate ?? '',
      platform: 'AppleMusic',
      tracks: trackList.map((t: any) => ({
        name: t?.trackName ?? '',
        artist: t?.artistName ?? albumInfo?.artistName ?? '',
        duration_s: Math.floor((t?.trackTimeMillis ?? 0) / 1000),
        track_number: t?.trackNumber ?? 0,
      })),
    }
  }
}
