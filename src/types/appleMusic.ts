// Apple Music - serialized-server-data TypeScript 类型定义
// 数据来源：https://music.apple.com/us/album/whatevers-clever/1845189970

// ─────────────────────────────────────────────
// 根结构
// ─────────────────────────────────────────────

/** script#serialized-server-data 的根结构 */
export interface AppleMusicSerializedServerData {
  /** 页面数据条目列表（通常只有一个元素） */
  data: PageEntry[];
  /** 用户 token 哈希（未登录时为空字符串） */
  userTokenHash: string;
}

/** 单个页面条目，包含页面意图和完整数据 */
export interface PageEntry {
  /** 页面意图，描述当前页面类型及目标内容 */
  intent: AlbumDetailPageIntent;
  /** 页面完整数据 */
  data: PageData;
}

// ─────────────────────────────────────────────
// 页面意图
// ─────────────────────────────────────────────

/** 专辑详情页意图 */
export interface AlbumDetailPageIntent {
  $kind: "AlbumDetailPageIntent";
  /** 目标内容描述符（指向当前专辑） */
  contentDescriptor: ContentDescriptor;
  /** 突出展示的条目标识符（通常为 null） */
  prominentItemIdentifier: string | null;
}

/** 页面刷新意图（用于订阅状态变更等事件触发时） */
export interface RefreshPageIntent {
  $kind: "RefreshPageIntent";
  /** 刷新后要加载的页面意图 */
  intent: AlbumDetailPageIntent;
  /** 刷新原因描述，如 "Subscription Status Changed" */
  reason: string;
}

// ─────────────────────────────────────────────
// 页面数据
// ─────────────────────────────────────────────

/** 页面完整数据 */
export interface PageData {
  /** 页面埋点/分析指令 */
  pageMetrics: PageMetrics;
  /** 页面各区块（Section）列表，按展示顺序排列 */
  sections: Section[];
  /** 页面失效规则（触发条件 → 刷新意图） */
  invalidationRules: InvalidationRules;
  /** 页面标准 URL */
  canonicalURL: string;
  /** SEO 元数据 */
  seoData: SeoData;
}

// ─────────────────────────────────────────────
// 页面埋点
// ─────────────────────────────────────────────

/** 页面级别的埋点配置 */
export interface PageMetrics {
  /** 埋点上报指令列表（何时上报哪些字段） */
  instructions: MetricsInstruction[];
  /** 页面基础字段（页面类型、URL 等） */
  pageFields: PageFields;
  /** 自定义扩展字段 */
  custom: Record<string, unknown>;
}

/** 单条埋点上报指令 */
export interface MetricsInstruction {
  /** 上报数据内容 */
  data: MetricsInstructionData;
  /** 触发时机，如 "pageEnter" | "appEnter" | "pageExit" | "appExit" */
  invocationPoints: string[];
}

/** 埋点指令的数据内容 */
export interface MetricsInstructionData {
  /** 上报 topic，如 "xp_its_music_main" */
  topic: string;
  /** 是否立即 flush（否则批量上报） */
  shouldFlush: boolean;
  /** 上报的事件字段，如 { eventType: "page" } */
  fields: Record<string, string>;
  /** 需要包含的字段名列表 */
  includingFields: string[];
  /** 需要排除的字段名列表 */
  excludingFields: string[];
}

/** 页面基础字段 */
export interface PageFields {
  /** 页面类型，如 "Album" */
  pageType: string;
  /** 页面完整 URL */
  pageUrl: string;
  /** 页面功能名称，如 "album_detail" */
  pageFeatureName: string;
  /** 页面内容 ID，如 "1845189970" */
  pageId: string;
  /** 页面唯一标识，如 "Album_1845189970" */
  page: string;
}

// ─────────────────────────────────────────────
// 区块（Section）—— 以 itemKind 作为判别字段
// ─────────────────────────────────────────────

/**
 * 页面区块联合类型，通过 itemKind 区分：
 * - containerDetailHeaderLockup：专辑 header
 * - trackLockup：曲目列表
 * - containerDetailTracklistFooterLockup：曲目列表底部信息
 * - spacer：占位分隔符
 * - verticalVideoLockup：MV 横向货架
 * - squareLockup：方形卡片货架（更多专辑 / 收录歌单 / 推荐）
 */
export type Section =
  | AlbumHeaderSection
  | TrackListSection
  | TracklistFooterSection
  | SpacerSection
  | VideoShelfSection
  | SquareLockupShelfSection;

/** 区块公共字段 */
interface SectionBase {
  /** 区块唯一 ID */
  id: string;
  /** 背景处理方式，如 "alternate"（交替背景色） */
  backgroundTreatment?: string;
  /** 是否显示分隔线 */
  displaySeparator?: boolean;
  /** 区块级别的曝光埋点 */
  impressionMetrics?: ImpressionMetrics;
  /** 区块标题栏（含"查看全部"链接） */
  header?: SectionHeader;
}

/** 专辑 header 区块（封面、标题、艺术家、播放按钮等） */
export interface AlbumHeaderSection extends SectionBase {
  itemKind: "containerDetailHeaderLockup";
  presentation: SinglePresentation;
  /** 固定只有一个 header 条目 */
  items: [AlbumHeaderItem];
}

/** 曲目列表区块 */
export interface TrackListSection extends SectionBase {
  itemKind: "trackLockup";
  presentation: CollectionPresentation;
  /** 曲目条目列表 */
  items: TrackItem[];
  /** 所属专辑的内容描述符 */
  containerContentDescriptor: ContentDescriptor;
  /** 所属专辑的封面图 */
  containerArtwork: Artwork;
}

/** 曲目列表底部信息区块（发行日期、总时长、版权等） */
export interface TracklistFooterSection extends SectionBase {
  itemKind: "containerDetailTracklistFooterLockup";
  presentation: SinglePresentation;
  items: [TracklistFooterItem];
}

/** 空白占位区块 */
export interface SpacerSection extends SectionBase {
  itemKind: "spacer";
  presentation: SinglePresentation;
  items: [{ id: string }];
}

/** MV 横向货架区块 */
export interface VideoShelfSection extends SectionBase {
  itemKind: "verticalVideoLockup";
  presentation: CollectionPresentation;
  items: VideoItem[];
}

/**
 * 方形卡片横向货架区块，用于：
 * - More By {Artist}（同艺术家更多专辑）
 * - Featured On（收录该专辑的歌单）
 * - You Might Also Like（猜你喜欢）
 */
export interface SquareLockupShelfSection extends SectionBase {
  itemKind: "squareLockup";
  presentation: CollectionPresentation;
  items: SquareLockupItem[];
}

// ─────────────────────────────────────────────
// 展示方式
// ─────────────────────────────────────────────

/** 单条目展示（如 header、footer） */
export interface SinglePresentation {
  kind: "single";
}

/** 多条目集合展示 */
export interface CollectionPresentation {
  kind: "collection";
  /** "list" 为垂直列表（曲目列表），ShelfLayout 为横向滚动货架 */
  layout: "list" | ShelfLayout;
}

/** 横向滚动货架布局 */
export interface ShelfLayout {
  kind: "shelf";
  /** 行数（通常为 1） */
  numberOfRows: number;
}

// ─────────────────────────────────────────────
// 区块标题栏
// ─────────────────────────────────────────────

/** 区块顶部标题栏 */
export interface SectionHeader {
  kind: "default";
  item: {
    /** 标题链接（点击可跳转"查看全部"页面） */
    titleLink: TitleLink;
  };
}

/** 带跳转能力的标题链接 */
export interface TitleLink {
  /** 显示文本 */
  title: string;
  /** 跳转动作（null 表示不可点击） */
  segue?: FlowAction | null;
}

// ─────────────────────────────────────────────
// 各类条目（Item）
// ─────────────────────────────────────────────

/** 专辑 header 条目（页面顶部核心信息） */
export interface AlbumHeaderItem {
  id: string;
  /** 专辑封面图 */
  artwork: Artwork | null;
  /** 竖版封面图（部分专辑有） */
  tallArtwork: Artwork | null;
  /** 专辑名称 */
  title: string;
  /** 艺术家链接列表（副标题，可点击跳转艺术家页） */
  subtitleLinks: SubtitleLink[] | null;
  /** 第三级标题链接（通常为 null） */
  tertiaryTitleLinks: SubtitleLink[] | null;
  /** 第四级标题，如 "Pop · 2026"（流派 + 年份） */
  quaternaryTitle: string | null;
  /** 弹出层内容描述（专辑简介/文案） */
  modalPresentationDescriptor: ModalPresentationDescriptor | null;
  /** 是否显示"显式内容"徽章（Explicit） */
  showExplicitBadge: boolean;
  /** 音质徽章（杜比全景声、无损等） */
  audioBadges: AudioBadges;
  /** 当前专辑的内容描述符 */
  contentDescriptor: ContentDescriptor;
  /** 播放/试听按钮 */
  playButton: PlayButton;
  /** 随机播放按钮（部分页面有） */
  shuffleButton: PlayButton | null;
  /** 动态封面视频（用于 header 背景动画） */
  videoArtwork: VideoArtwork | null;
  /** 竖版动态封面视频 */
  tallVideoArtwork: VideoArtwork | null;
  /** 专辑总曲目数 */
  trackCount: number;
  /** Siri Banner 配置（通常为 null） */
  siriBannerConfiguration: unknown | null;
  /** 是否为试听模式（非订阅用户） */
  isPreviewMode: boolean;
  /** 曝光埋点 */
  impressionMetrics: ImpressionMetrics;
  /** 购买/订阅选项列表 */
  offers: Offer[];
}

/** 单首曲目条目 */
export interface TrackItem {
  id: string;
  /** 歌曲名称 */
  title: string;
  /** 曲目编号（从 1 开始） */
  trackNumber: number;
  /** 第三级链接（通常为 null） */
  tertiaryLinks: SubtitleLink[] | null;
  /** 时长（毫秒） */
  duration: number;
  /** 歌曲内容描述符（含 storeAdamID 和页面链接） */
  contentDescriptor: ContentDescriptor;
  /** 曲目封面（专辑曲目通常为 null，使用专辑封面） */
  artwork: Artwork | null;
  /**
   * 副标题链接列表，即参与合作的艺术家。
   * 单人曲目通常为 null；合作曲目每位艺术家一个元素。
   */
  subtitleLinks: SubtitleLink[] | null;
  /** 播放动作 */
  playAction: PlayAction;
  /** 暂停动作 */
  pauseAction: PauseAction;
  /** 恢复播放动作 */
  resumeAction: ResumeAction;
  /** 列表展示样式 */
  layoutStyle: TrackLayoutStyle;
  /** 是否显示"显式内容"徽章 */
  showExplicitBadge: boolean;
  /** 是否为热门曲目（突出显示） */
  isProminent: boolean;
  /** 是否禁用（不可播放） */
  isDisabled: boolean;
  /** 是否为试听模式 */
  isPreviewMode: boolean;
  /** 词曲作者 */
  composer: string;
  /** 是否显示热度指示器（Popular） */
  showPopularityIndicator: boolean;
  /** 碟号（多碟专辑使用） */
  discNumber: number;
  /**
   * 艺术家名称字符串，多位艺术家用 " & " 分隔。
   * 与 subtitleLinks 对应，但为纯文本形式。
   */
  artistName: string;
  /** 30 秒试听片段 URL（AAC 格式） */
  previewUrl: string;
  /** 曝光埋点 */
  impressionMetrics: ImpressionMetrics;
  /** 社交资料内容描述符（通常为 null） */
  socialProfileContentDescriptor: ContentDescriptor | null;
}

/** 曲目列表底部条目（发行信息、购买选项） */
export interface TracklistFooterItem {
  id: string;
  /** 所属专辑的内容描述符 */
  contentDescriptor: ContentDescriptor;
  /** 社交徽章数量（如评论数） */
  numberOfSocialBadges: number;
  /**
   * 发行信息多行文本，如：
   * "March 27, 2026\n12 songs, 38 minutes\n℗ 2026 Atlantic Records Group LLC"
   */
  description: string;
  /** 链接区块（通常为 null） */
  linkSection: unknown | null;
  /** 购买/订阅选项列表 */
  offers: Offer[];
}

/** MV 货架条目 */
export interface VideoItem {
  id: string;
  /** MV 封面图 */
  artwork: Artwork;
  /** MV 标题 */
  title: string;
  /** MV 名称（与 title 相同） */
  name: string;
  /** MV 内容描述符 */
  contentDescriptor: ContentDescriptor;
  /** 点击跳转动作（跳转到 MV 详情页） */
  segue: FlowAction;
  /** 标题链接列表 */
  titleLinks: TitleLink[];
  /** 艺术家链接列表 */
  subtitleLinks: SubtitleLink[];
  /** 播放动作 */
  playAction: PlayAction;
  /** 是否显示"显式内容"徽章 */
  showExplicitBadge: boolean;
  /** 展示尺寸样式，如 "large" */
  displayStyle: string;
  /** 曝光埋点 */
  impressionMetrics: ImpressionMetrics;
}

/**
 * 方形卡片条目，用于专辑、单曲、EP、歌单等。
 * 出现在"更多专辑"、"收录歌单"、"猜你喜欢"等货架中。
 */
export interface SquareLockupItem {
  id: string;
  /** 封面图 */
  artwork: Artwork;
  /** 标题链接列表（专辑名 / 歌单名） */
  titleLinks: TitleLink[];
  /** 内容描述符（album / playlist 等） */
  contentDescriptor: ContentDescriptor;
  /**
   * 副标题链接列表，含义因内容类型而异：
   * - 专辑/EP：发行年份字符串
   * - 歌单：策划方名称（如 "Apple Music Pop"）
   */
  subtitleLinks: SubtitleLink[];
  /** 点击跳转动作 */
  segue: FlowAction;
  /** 播放动作 */
  playAction: PlayAction;
  /** 社交徽章数量 */
  numberOfSocialBadges: number;
  /** 是否显示"显式内容"徽章 */
  showExplicitBadge: boolean;
  /** 无障碍标签（通常与标题相同） */
  accessibilityLabel: string;
  /** 曲目总数（仅专辑/EP 有此字段） */
  trackCount?: number;
  /** 是否为 Audio-Only Download（通常为 false） */
  isAOD: boolean;
  /** 曝光埋点 */
  impressionMetrics: ImpressionMetrics;
}

// ─────────────────────────────────────────────
// 共用：内容描述符
// ─────────────────────────────────────────────

/** 内容类型枚举 */
export type ContentKind =
  | "album"         // 专辑
  | "song"          // 歌曲
  | "artist"        // 艺术家
  | "playlist"      // 歌单
  | "musicVideo"    // MV
  | "appleCurator"; // Apple 官方策划方

/**
 * 内容描述符，用于统一引用任意类型的 Apple Music 内容。
 * 包含类型、ID 和页面 URL。
 */
export interface ContentDescriptor {
  /** 内容类型 */
  kind: ContentKind;
  identifiers: {
    /** Apple Music 内容 ID */
    storeAdamID: string;
  };
  /** Apple Music 页面链接 */
  url: string;
  /** 区域和语言设置（仅顶层 intent 中携带） */
  locale?: {
    /** 店面区域代码，如 "us" */
    storefront: string;
    /** 语言代码，如 "en-US"，null 表示使用默认语言 */
    language: string | null;
  };
}

// ─────────────────────────────────────────────
// 共用：封面图
// ─────────────────────────────────────────────

/** 封面图容器 */
export interface Artwork {
  /** 图片详细信息 */
  dictionary: ArtworkDictionary;
  /** 裁剪方式，如 "cc"（居中裁剪） */
  cropStyle?: string;
}

/** 封面图详细信息 */
export interface ArtworkDictionary {
  /** 背景主色（十六进制，不含 #） */
  bgColor: string;
  /** 是否为 P3 广色域图片 */
  hasP3: boolean;
  /** 图片原始高度（像素） */
  height: number;
  /** 图片原始宽度（像素） */
  width: number;
  /**
   * 图片 URL 模板，使用 {w}、{h}、{f} 占位符。
   * 例如：https://…/{w}x{h}bb.{f}
   * 需替换为实际尺寸和格式（如 300x300bb.jpg）
   */
  url: string;
  /** 主要文字颜色（适合叠加在封面上的颜色） */
  textColor1: string;
  /** 次要文字颜色 */
  textColor2: string;
  /** 第三文字颜色（较淡） */
  textColor3: string;
  /** 第四文字颜色（最淡） */
  textColor4: string;
  /** 渐变配置（部分封面有） */
  gradient?: {
    color: string;
    y2: number;
  };
  /** 文字渐变色列表 */
  textGradient?: string[];
  /** 动态封面视频信息（仅 header 专辑封面可能携带） */
  motionDetailSquare?: MotionArtwork;
}

/** 动态封面（视频循环播放的专辑封面） */
export interface MotionArtwork {
  /** 视频首帧预览图 */
  previewFrame: ArtworkDictionary;
  /** HLS 视频流 URL（.m3u8） */
  video: string;
}

/** 动态视频封面（用于 header 背景） */
export interface VideoArtwork {
  dictionary: {
    /** 动态封面视频 */
    motionDetailSquare?: MotionArtwork;
    /** 裁剪方式 */
    cropStyle?: string;
  };
}

// ─────────────────────────────────────────────
// 共用：动作
// ─────────────────────────────────────────────

/** 动作类型枚举 */
export type ActionKind =
  | "flowAction"            // 页面跳转
  | "playAction"            // 播放
  | "pausePlaybackAction"   // 暂停
  | "resumePlaybackAction"; // 恢复播放

/** 页面跳转动作（点击后导航到目标页面） */
export interface FlowAction {
  $kind: "flowAction";
  /** 跳转目标 */
  destination: FlowDestination;
  /** 跳转埋点 */
  actionMetrics: ActionMetrics;
}

/** 跳转目标描述 */
export interface FlowDestination {
  /** 目标页面类型：内容详情页 或 目录页（查看全部） */
  kind: "catalogItemDetailPage" | "catalogPage";
  /** 目标内容描述符（catalogItemDetailPage 时使用） */
  contentDescriptor?: ContentDescriptor;
  /** 突出展示条目标识符 */
  prominentItemIdentifier?: string | null;
  /** "查看全部"页面的意图（catalogPage 时使用） */
  intent?: ContainerDetailSeeAllPageIntent;
}

/** "查看全部"页面的意图描述 */
export interface ContainerDetailSeeAllPageIntent {
  $kind: "ContainerDetailSeeAllPageIntent";
  /** API 请求路径 */
  url: string;
  /** 视图类型，如 "more-by-artist" | "appears-on" | "you-might-also-like" */
  viewKind: string;
  /** 视图 ID */
  id: string;
  /** 页面标题，如 "More By Charlie Puth" */
  title: string;
  /** 容器内容类型，如 "albums" */
  containerType: string;
}

/** 播放动作 */
export interface PlayAction {
  $kind: "playAction";
  /** 播放埋点 */
  actionMetrics: ActionMetrics;
  /** 要播放的内容列表 */
  items: Array<{ contentDescriptor: ContentDescriptor }>;
  /** 所属容器（如播放单曲时所属的专辑） */
  containerContentDescriptor?: ContentDescriptor;
  /** 播放队列分组标识符（同一专辑的曲目共享同一值） */
  groupingIdentifier: string | null;
}

/** 暂停动作 */
export interface PauseAction {
  $kind: "pausePlaybackAction";
  actionMetrics: ActionMetrics;
}

/** 恢复播放动作 */
export interface ResumeAction {
  $kind: "resumePlaybackAction";
  actionMetrics: ActionMetrics;
}

/** 播放/试听按钮 */
export interface PlayButton {
  /** 按钮 ID */
  id: string;
  /** 点击触发的播放动作 */
  segue: PlayAction;
  /** 按钮文字，如 "Preview"（试听） */
  title: string;
  /** 按钮曝光埋点 */
  impressionMetrics: ImpressionMetrics;
}

// ─────────────────────────────────────────────
// 共用：埋点 / 曝光追踪
// ─────────────────────────────────────────────

/** 动作埋点数据 */
export interface ActionMetrics {
  /** 事件列表（每次动作可能上报多条） */
  data: MetricsEvent[];
  /** 自定义扩展字段，如 { sectionName: "track-list - 1845189970" } */
  custom: Record<string, unknown>;
}

/** 单条埋点事件 */
export interface MetricsEvent {
  /** 事件字段 */
  fields: MetricsEventFields;
  /** 需要包含的字段名列表 */
  includingFields: string[];
  /** 需要排除的字段名列表 */
  excludingFields: string[];
  /** 上报 topic */
  topic: string;
  /** 是否立即 flush */
  shouldFlush: boolean;
}

/** 埋点事件核心字段 */
export interface MetricsEventFields {
  /** 动作类型，如 "navigate" | "play" */
  actionType: string;
  /** 动作详情，如 { kind: "song", sectionName: "..." } */
  actionDetails: Record<string, unknown>;
  /** 动作目标 URL */
  actionUrl: string;
  /** 事件触发方式，如 "click" */
  eventType: string;
  /** 触发元素类型，如 "link" | "button" | "ShelfItem" */
  targetType: string;
  /** 触发元素 ID（通常为内容 ID） */
  targetId: string;
  /** 事件协议版本 */
  eventVersion: number;
}

/** 曝光埋点（记录条目何时进入视口） */
export interface ImpressionMetrics {
  /** 曝光 ID 信息 */
  id: ImpressionId;
  /** 曝光字段 */
  fields: ImpressionFields;
  /** 点击位置信息 */
  clickLocationFields: ClickLocationFields;
  /** 自定义扩展字段 */
  custom: Record<string, unknown>;
}

/** 曝光 ID 结构 */
export interface ImpressionId {
  /** 当前条目的曝光 ID */
  id: string;
  /** 在同级条目中的索引位置（从 0 开始） */
  impressionIndex: number;
  /** 父级容器的曝光 ID（Section 级别） */
  parentId?: string;
}

/** 曝光数据字段 */
export interface ImpressionFields {
  /** 唯一曝光 ID（数字） */
  impressionId: number;
  /** 内容 ID */
  id: string;
  /** 曝光位置索引 */
  impressionIndex: number;
  /** 父级曝光 ID */
  impressionParentId?: number;
  /** 内容名称（标题） */
  name?: string;
  /** 曝光元素类型，如 "containerDetail" | "tracks" | "Shelf" | "ShelfItem" | "button" */
  impressionType: string;
  /** 内容类型，如 "album" | "song" */
  kind?: string;
}

/** 点击位置信息（用于分析点击发生在页面的哪个位置） */
export interface ClickLocationFields {
  /** 内容 ID */
  id: string;
  /** 点击位置顺序（从 0 开始） */
  locationPosition: number;
  /** 内容名称 */
  name?: string;
  /** 位置类型，与 impressionType 对应 */
  locationType: string;
  /** 内容类型 */
  kind?: string;
}

// ─────────────────────────────────────────────
// 共用：其他
// ─────────────────────────────────────────────

/** 带跳转链接的副标题条目（艺术家名、策划方等） */
export interface SubtitleLink {
  /** 显示文本，如艺术家名 "Kenny G" */
  title: string;
  /** 点击跳转动作（跳转到对应详情页） */
  segue?: FlowAction;
}

/** 音质徽章配置 */
export interface AudioBadges {
  /** 杜比全景声（空间音频） */
  dolbyAtmos: boolean;
  /** 杜比音频 */
  dolbyAudio: boolean;
  /** Apple 无损（ALAC，最高 24-bit/48kHz） */
  lossless: boolean;
  /** Hi-Res 无损（最高 24-bit/192kHz） */
  hiResLossless: boolean;
  /** Apple Digital Master（母带级音质） */
  digitalMaster: boolean;
}

/** 购买/订阅选项 */
export interface Offer {
  /** 购买参数字符串（含价格、salableAdamId 等） */
  buyParams: string;
  /** 价格数值（订阅为 0） */
  price: number;
  /** 格式化价格字符串，如 "$9.99" 或 "$0.00" */
  priceFormatted: string;
  /** 类型：买断 或 订阅 */
  type: "buy" | "subscription";
}

/** 专辑简介弹出层内容 */
export interface ModalPresentationDescriptor {
  /** 弹出层标题（专辑名） */
  headerTitle: string;
  /** 弹出层副标题（艺术家名 · 年份） */
  headerSubtitle: string;
  /**
   * 专辑文案/简介，可能包含 HTML 标签（如 <i> 斜体）。
   * 来自 Apple Music 编辑团队。
   */
  paragraphText: string;
}

/** 曲目列表展示样式 */
export interface TrackLayoutStyle {
  /** 固定为 "albumTrackList" */
  kind: "albumTrackList";
  /** 是否为 MV 条目（影响展示样式） */
  hasVideo: boolean;
}

// ─────────────────────────────────────────────
// 页面失效规则 & SEO
// ─────────────────────────────────────────────

/** 页面失效规则（监听事件 → 触发刷新） */
export interface InvalidationRules {
  /** 事件触发器列表 */
  eventTriggers: EventTrigger[];
}

/** 单条事件触发器 */
export interface EventTrigger {
  /**
   * 监听的事件列表，如：
   * - "subscriptionStatusChange"（订阅状态变更）
   * - "restrictionsDidChange"（内容限制变更）
   */
  events: Array<{ name: string }>;
  /** 事件触发时执行的刷新意图 */
  intent: RefreshPageIntent;
}

/** SEO 元数据 */
export interface SeoData {
  /** 页面 <title> 标签内容 */
  pageTitle: string;
}