/**
 * Apple Music 网页 Schema (LD+JSON) 统一接口
 */
export interface AppleMusicWebSchema {
  '@context': string
  '@type': 'MusicAlbum'
  name: string // 专辑名称
  description: string
  url: string
  image: string // 封面图 URL
  datePublished: string // 发行日期
  genre: string[] // 流派数组，例如 ["K-Pop", "音乐"]
  byArtist: MusicGroup[] // 艺人信息
  tracks: MusicRecording[] // 曲目列表

  // 额外关联数据
  citation?: MusicAlbumBrief[] // 相关推荐/引用专辑
  workExample?: (MusicAlbumBrief | MusicRecordingBrief)[] // 艺人其他作品
  potentialAction?: ListenAction
}

/**
 * 艺人/团体信息
 */
interface MusicGroup {
  '@type': 'MusicGroup'
  name: string
  url: string
}

/**
 * 单曲曲目详细信息
 */
interface MusicRecording {
  '@type': 'MusicRecording'
  name: string
  duration: string // ISO 8601 格式，如 "PT2M7S"
  url: string
  audio: AudioObject
  offers?: Offer
}

/**
 * 预览音频对象
 */
interface AudioObject {
  '@type': 'AudioObject'
  name: string
  contentUrl: string // 试听片段链接 (m4a)
  duration: string
  uploadDate: string
  thumbnailUrl: string
}

/**
 * 简略专辑信息 (用于 citation 或 workExample)
 */
interface MusicAlbumBrief {
  '@type': 'MusicAlbum'
  name: string
  image: string
  url: string
}

/**
 * 简略曲目信息
 */
interface MusicRecordingBrief {
  '@type': 'MusicRecording'
  name: string
  url: string
  duration: string
}

/**
 * 价格/动作相关接口 (选填)
 */
interface Offer {
  '@type': 'Offer'
  category: string
  price: number
}

interface ListenAction {
  '@type': 'ListenAction'
  target: {
    '@type': 'EntryPoint'
    actionPlatform: string
  }
}

/**
 * Spotify Embed Player 主接口响应结构
 */
export interface SpotifyEmbedResponse {
  props: {
    pageProps: {
      state: SpotifyPlayerState
      config: SpotifyConfig
    }
  }
  page: string // 例如: "/album/[id]"
  query: {
    id: string
    si: string
  }
  buildId: string
}

/**
 * 核心状态数据
 */
export interface SpotifyPlayerState {
  data: {
    entity: SpotifyAlbumEntity
    embeded_entity_uri: string
  }
  settings: SpotifyPlayerSettings
  machineState: MachineState
}

/**
 * 专辑/实体详细信息
 */
interface SpotifyAlbumEntity {
  type: 'album' | 'track' | 'playlist'
  id: string
  name: string
  title: string
  subtitle: string // 通常是艺人名称
  uri: string
  releaseDate: {
    isoString: string // ISO 8601 格式
  }
  isPlayable: boolean
  isExplicit: boolean
  trackList: SpotifyTrack[]
  visualIdentity: VisualIdentity
}

/**
 * 曲目信息
 */
interface SpotifyTrack {
  uri: string
  uid: string
  title: string
  subtitle: string
  duration: number // 毫秒单位
  isPlayable: boolean
  audioPreview: {
    format: 'MP3_96' | string
    url: string
  }
  entityType: 'track'
}

/**
 * 视觉识别与配色方案
 */
interface VisualIdentity {
  image: SpotifyImage[]
  // 这里的颜色通常用于动态渲染 CSS 变量
  backgroundBase: RGBA
  backgroundTintedBase: RGBA
  textBase: RGBA
  textBrightAccent: RGBA
  textSubdued: RGBA
}

interface RGBA {
  red: number
  green: number
  blue: number
  alpha: number
}

interface SpotifyImage {
  url: string
  maxHeight: number
  maxWidth: number
}

/**
 * 播放器环境设置
 */
interface SpotifyPlayerSettings {
  isDarkMode: boolean
  isMobile: boolean
  isSafari: boolean
  session: {
    accessToken: string
    accessTokenExpirationTimestampMs: number
    isAnonymous: boolean
  }
  clientId: string
}

/**
 * 内部状态机（控制 UI 显示）
 */
interface MachineState {
  initialized: boolean
  playbackMode: 'unknown' | 'playing' | 'paused'
  currentPreviewTrackIndex: number
}

interface SpotifyConfig {
  locale: string
  correlationId: string
}
