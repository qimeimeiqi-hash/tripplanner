export interface PdfBlockInfo {
  el: HTMLElement
  isHeading: boolean
}

/**
 * Collects the atomic, non-splittable content blocks to lay out in the exported PDF, in
 * document order. Each top-level child of the export container is one block (so a page break
 * never falls inside a paragraph, table, or list) — except the daily-plan section, which is
 * split into its heading plus one block per day card, so a multi-day itinerary can still break
 * cleanly between days instead of mid-day. Any element marked `data-pdf-exclude="true"` (the
 * live map section) is skipped entirely: a Leaflet map doesn't render meaningfully as a static
 * html2canvas snapshot — tiles are frequently missing, the route overlay lands in the wrong
 * place, and none of it is interactive on paper anyway.
 */
export function collectPdfBlocks(container: HTMLElement): PdfBlockInfo[] {
  const blocks: PdfBlockInfo[] = []

  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.dataset.pdfExclude === 'true') continue

    if (child.tagName === 'SECTION') {
      const dayCards = Array.from(child.querySelectorAll(':scope > .day-card')).filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
      )
      if (dayCards.length > 0) {
        const heading = child.querySelector(':scope > h3')
        if (heading instanceof HTMLElement) blocks.push({ el: heading, isHeading: true })
        for (const day of dayCards) blocks.push({ el: day, isHeading: false })
      } else {
        blocks.push({ el: child, isHeading: false })
      }
      continue
    }

    blocks.push({ el: child, isHeading: child.tagName === 'H2' })
  }

  return blocks
}

export interface PdfLayoutOptions {
  pageHeightMm: number
  marginMm: number
  /** Minimum room (mm) a heading block needs after it on the same page, else it moves to the next page. */
  minTrailingSpaceMm: number
  /** Vertical gap (mm) inserted after each block. */
  blockGapMm: number
}

export interface PdfBlockPlacement {
  /** 0-indexed page the block starts on. */
  pageIndex: number
  /** Y offset in mm from the page's top margin where the block starts. */
  y: number
}

/**
 * Decides which page each block starts on and at what Y offset, given each block's rendered
 * height in mm. A block that fits within one full page moves to a fresh page rather than being
 * cut across a page boundary. A heading block additionally moves to a fresh page if too little
 * room would be left after it for anything to visibly follow (avoids an orphaned heading alone
 * at the bottom of a page). A block taller than a full page is left for the caller to slice
 * across pages; this function still returns its correct starting position and advances its own
 * cursor through however many pages that slicing will consume, so later blocks land correctly.
 */
export function planPdfLayout(
  blockHeightsMm: number[],
  isHeadingFlags: boolean[],
  { pageHeightMm, marginMm, minTrailingSpaceMm, blockGapMm }: PdfLayoutOptions,
): PdfBlockPlacement[] {
  const usableHeight = pageHeightMm - marginMm * 2
  const placements: PdfBlockPlacement[] = []

  let pageIndex = 0
  let y = 0
  let isFirstOnPage = true

  for (let i = 0; i < blockHeightsMm.length; i++) {
    const height = blockHeightsMm[i]
    const isHeading = isHeadingFlags[i]
    const fitsOnEmptyPage = height <= usableHeight

    if (!isFirstOnPage) {
      const spaceLeft = usableHeight - y
      const doesNotFit = fitsOnEmptyPage && height > spaceLeft
      const orphanHeading = isHeading && spaceLeft < minTrailingSpaceMm
      if (doesNotFit || orphanHeading) {
        pageIndex += 1
        y = 0
        isFirstOnPage = true
      }
    }

    placements.push({ pageIndex, y })

    if (fitsOnEmptyPage) {
      y += height + blockGapMm
    } else {
      let remaining = height
      while (remaining > 0) {
        const spaceOnPage = usableHeight - y
        const slice = Math.min(remaining, spaceOnPage)
        remaining -= slice
        if (remaining > 0) {
          pageIndex += 1
          y = 0
        } else {
          y += slice + blockGapMm
        }
      }
    }
    isFirstOnPage = false
  }

  return placements
}
