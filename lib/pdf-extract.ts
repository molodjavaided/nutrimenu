/**
 * Extract text from a PDF buffer using pdfjs-dist (server-side).
 * Returns the raw text per page, and a flag indicating if the PDF
 * has meaningful text content (vs being a scan/image-only PDF).
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// pdfjs needs a worker — in Node (server route) we use the legacy no-worker build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pdfjs as any).GlobalWorkerOptions.workerSrc = ''

export interface PDFExtractResult {
  /** Concatenated text from all pages */
  text: string
  /** Number of pages */
  pageCount: number
  /** True if the PDF has enough real text to skip Vision parsing */
  hasText: boolean
}

const MIN_CHARS_PER_PAGE = 80

export async function extractPDFText(buffer: Uint8Array): Promise<PDFExtractResult> {
  const loadingTask = pdfjs.getDocument({
    data: buffer,
    useWorkerFetch: false,
    useSystemFonts: true,
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const pages: string[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    pages.push(pageText)
  }

  const text = pages.join('\n\n--- страница ---\n\n')
  const avgCharsPerPage = pages.reduce((s, p) => s + p.length, 0) / Math.max(pageCount, 1)
  const hasText = avgCharsPerPage >= MIN_CHARS_PER_PAGE

  return { text, pageCount, hasText }
}
