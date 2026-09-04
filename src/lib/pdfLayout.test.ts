import { describe, expect, it } from 'vitest'
import { collectPdfBlocks, planPdfLayout } from './pdfLayout'

function buildExportContainer(innerHtml: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = innerHtml
  return container
}

describe('collectPdfBlocks', () => {
  it('produces one block per top-level h2/p/section child, in document order', () => {
    const container = buildExportContainer(`
      <h2>Paris</h2>
      <p class="itinerary-summary">A trip.</p>
      <section><h3>Transport</h3><ul></ul></section>
      <section><h3>Budget</h3><table></table></section>
    `)
    const blocks = collectPdfBlocks(container)
    expect(blocks.map((b) => b.el.tagName)).toEqual(['H2', 'P', 'SECTION', 'SECTION'])
  })

  it('excludes an element marked data-pdf-exclude="true" (the map section)', () => {
    const container = buildExportContainer(`
      <h2>Paris</h2>
      <section data-pdf-exclude="true"><h3>Map</h3><div id="leaflet"></div></section>
      <section><h3>Budget</h3><table></table></section>
    `)
    const blocks = collectPdfBlocks(container)
    expect(blocks).toHaveLength(2)
    expect(blocks.some((b) => b.el.querySelector('#leaflet'))).toBe(false)
  })

  it('splits the daily-plan section into a heading block plus one block per day card', () => {
    const container = buildExportContainer(`
      <section>
        <h3>Daily Plan</h3>
        <div class="day-card" data-day="1"></div>
        <div class="day-card" data-day="2"></div>
        <div class="day-card" data-day="3"></div>
      </section>
    `)
    const blocks = collectPdfBlocks(container)
    expect(blocks).toHaveLength(4)
    expect(blocks[0].isHeading).toBe(true)
    expect(blocks[0].el.tagName).toBe('H3')
    expect(blocks.slice(1).map((b) => b.el.getAttribute('data-day'))).toEqual(['1', '2', '3'])
    expect(blocks.slice(1).every((b) => !b.isHeading)).toBe(true)
  })

  it('treats a section without day cards as a single atomic block, not split by its children', () => {
    const container = buildExportContainer(`
      <section>
        <h3>Must-Eat Food</h3>
        <div class="equipment-grid">
          <div class="equipment-card"></div>
          <div class="equipment-card"></div>
        </div>
      </section>
    `)
    const blocks = collectPdfBlocks(container)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].isHeading).toBe(false)
  })

  it('marks a top-level h2 as a heading block and a top-level p as non-heading', () => {
    const container = buildExportContainer(`<h2>Title</h2><p>Summary text</p>`)
    const blocks = collectPdfBlocks(container)
    expect(blocks[0].isHeading).toBe(true)
    expect(blocks[1].isHeading).toBe(false)
  })
})

describe('planPdfLayout', () => {
  const baseOptions = { pageHeightMm: 297, marginMm: 10, minTrailingSpaceMm: 20, blockGapMm: 4 }
  // usable height per page = 297 - 10*2 = 277

  it('places the first block at the top of page 0', () => {
    const placements = planPdfLayout([50], [false], baseOptions)
    expect(placements).toEqual([{ pageIndex: 0, y: 0 }])
  })

  it('stacks a second block below the first on the same page when it fits', () => {
    const placements = planPdfLayout([50, 60], [false, false], baseOptions)
    expect(placements[1]).toEqual({ pageIndex: 0, y: 50 + baseOptions.blockGapMm })
  })

  it('moves a block to the next page when it would not fully fit in the remaining space', () => {
    // 250mm block + 4mm gap uses 254mm, leaving 23mm of the 277mm usable height; a 40mm
    // block cannot fit there.
    const placements = planPdfLayout([250, 40], [false, false], baseOptions)
    expect(placements[1]).toEqual({ pageIndex: 1, y: 0 })
  })

  it('does not start a new page when a block exactly fills the remaining space', () => {
    const placements = planPdfLayout([100, 173], [false, false], baseOptions)
    // remaining space after the first block = 277 - (100 + 4) = 173, exactly matching the second block
    expect(placements[1]).toEqual({ pageIndex: 0, y: 104 })
  })

  it('pushes a heading to the next page when too little trailing space would be left for content after it', () => {
    // 260mm block + 4mm gap uses 264mm, leaving 13mm — under the 20mm minimum trailing
    // space a heading needs.
    const placements = planPdfLayout([260, 10], [false, true], baseOptions)
    expect(placements[1]).toEqual({ pageIndex: 1, y: 0 })
  })

  it('does not apply the heading-orphan rule to non-heading blocks', () => {
    const placements = planPdfLayout([260, 10], [false, false], baseOptions)
    expect(placements[1]).toEqual({ pageIndex: 0, y: 264 })
  })

  it('spans a block taller than a full page across multiple pages, and places the next block on the following page', () => {
    // usable height 277; a 600mm block starting at y=0 needs ceil(600/277) = 3 pages,
    // ending with 600 - 2*277 = 46mm used on its last page.
    const placements = planPdfLayout([600, 30], [false, false], baseOptions)
    expect(placements[0]).toEqual({ pageIndex: 0, y: 0 })
    expect(placements[1]).toEqual({ pageIndex: 2, y: 46 + baseOptions.blockGapMm })
  })

  it('accounts for a partially-used page when an oversized block starts partway down it', () => {
    // Block 0 (200mm + 4mm gap) leaves 73mm free on page 0. Block 1 (300mm, oversized)
    // consumes that 73mm, then finishes on page 1 after 300-73=227mm, landing its own
    // cursor at y=227+4=231 there — which is where block 2 must start.
    const placements = planPdfLayout([200, 300, 30], [false, false, false], baseOptions)
    expect(placements[2]).toEqual({ pageIndex: 1, y: 231 })
  })

  it('returns an empty array for no blocks', () => {
    expect(planPdfLayout([], [], baseOptions)).toEqual([])
  })
})
