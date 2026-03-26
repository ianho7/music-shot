declare module '*paraglide/messages' {
  export const m: Record<string, (args?: Record<string, unknown>) => string>
}

declare module '*paraglide/runtime' {
  export function getLocale(): 'en' | 'zh'
  export function setLocale(
    locale: 'en' | 'zh',
    options?: { reload?: boolean },
  ): void | Promise<void>
}

