/**
 * 统一的音乐数据接口
 */
import { m } from './paraglide/messages'
import type { AppleMusicWebSchema, SpotifyEmbedResponse } from './types'
import type { AlbumHeaderSection, AppleMusicSerializedServerData } from './types/appleMusic'

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
      return this.parseAppleMusicWeb(url)
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

    // 新版 Spotify Embed: Next.js 注入在 __NEXT_DATA__ 中
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    )
    if (nextDataMatch) {
      const nextDataRaw = nextDataMatch[1]
      if (!nextDataRaw) {
        throw new Error(m.error_parse_failed())
      }
      const nextData: SpotifyEmbedResponse = JSON.parse(nextDataRaw)
      const entity = nextData?.props?.pageProps?.state?.data?.entity
      if (!entity) {
        throw new Error(m.error_parse_failed())
      }

      const images = Array.isArray(entity.visualIdentity?.image) ? entity.visualIdentity.image : []
      const bestImage = images.reduce(
        (best, current) => ((current?.maxWidth ?? 0) > (best?.maxWidth ?? 0) ? current : best),
        images[0],
      )
      const tracks = Array.isArray(entity.trackList) ? entity.trackList : []

      return {
        title: entity.title || entity.name || '',
        artist: entity.subtitle || '',
        cover_url: bestImage?.url || '',
        release_date: entity.releaseDate?.isoString || '',
        platform: 'Spotify',
        tracks: tracks.map((t, i) => ({
          name: t.title || '',
          artist: t.subtitle || entity.subtitle || '',
          duration_s: Math.floor((t.duration ?? 0) / 1000),
          track_number: i + 1,
        })),
      }
    }

    throw new Error(m.error_parse_failed())
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
   * Apple Music 网页解析逻辑 (不通过 iTunes API)
   */
  private async parseAppleMusicWeb(url: string): Promise<AlbumData> {
    // 1. 通过代理获取网页 HTML
    // 注意：Apple Music 必须过代理，否则浏览器会拦截请求
    const response = await fetch(`${this.PROXY}${encodeURIComponent(url)}`)
    if (!response.ok) throw new Error(m.error_parse_failed())
    const proxyRaw = await response.text()
    const html = this.extractHtmlFromProxyResponse(proxyRaw)

    // 2. 提取 ld+json 脚本内容
    const regex = /<script id=schema:music-album[^>]*>([\s\S]*?)<\/script>/
    const serverDataRegex = /<script[^>]*id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/
    
    const match = html.match(regex)
    if (!match) throw new Error(m.error_parse_failed())
    const schemaRaw = match[1]
    if (!schemaRaw) throw new Error(m.error_parse_failed())

    const serverDataMatch = html.match(serverDataRegex)
    if (!serverDataMatch) throw new Error(m.error_parse_failed())
    const serverDataRaw = serverDataMatch[1]
    if (!serverDataRaw) throw new Error(m.error_parse_failed())

    let data: AppleMusicWebSchema
    let serverData: AppleMusicSerializedServerData
    try {
      data = JSON.parse(schemaRaw)
      serverData = JSON.parse(serverDataRaw)
    } catch (error) {
      throw new Error('Apple schema JSON or server data JSON parse failed', { cause: error })
    }

    // 3. 映射到统一的 AlbumData 格式
    const trackSection = serverData.data[0]?.data.sections.find((item) => item.itemKind === 'trackLockup')
    const artistList = trackSection && trackSection.items.map((item) => (item.subtitleLinks || []).map((s) => s.title || '').join(', ')) || []

    return {
      title: data.name,
      artist: data.byArtist[0] ? data.byArtist[0].name : '',
      cover_url: data.image.replace('{w}x{h}bb', '1000x1000bb'), // 替换尺寸占位符
      release_date: data.datePublished,
      platform: 'AppleMusic',
      // 邪修福利：Apple 网页版直接带了 Genre
      genre: data.genre ? data.genre[0] : 'Unknown',
      tracks: data.tracks.map((t, i) => ({
        name: t.name,
        // artist: data.byArtist[0] ? data.byArtist[0].name : '',
        artist:artistList[i] || (data.byArtist[0] ? data.byArtist[0].name : ''),
        // Apple 网页版时长格式是 ISO 8601 (例如 "PT2M58S")
        duration_s: this.parseISO8601Duration(t.duration),
        track_number: i + 1,
      })),
    }
  }

  /**
   * 辅助方法：将 ISO 8601 时长（如 PT3M45S）转换为秒
   */
  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(\d+M)?(\d+S)?/)
    if (!match) return 0
    const minutes = parseInt(match[1] || '0', 10) || 0
    const seconds = parseInt(match[2] || '0', 10) || 0
    return minutes * 60 + seconds
  }
}
