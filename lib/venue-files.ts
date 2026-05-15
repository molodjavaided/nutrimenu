export const FILE_CATEGORIES = ['menu_source', 'ttk', 'logo', 'photo', 'other'] as const
export type FileCategory = (typeof FILE_CATEGORIES)[number]

export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  menu_source: 'Меню (исходник)',
  ttk: 'ТТК',
  logo: 'Логотип',
  photo: 'Фото',
  other: 'Прочее',
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime)
}

export function isFileCategory(v: unknown): v is FileCategory {
  return typeof v === 'string' && (FILE_CATEGORIES as readonly string[]).includes(v)
}
