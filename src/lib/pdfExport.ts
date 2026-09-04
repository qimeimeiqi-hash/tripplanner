import { collectPdfBlocks, planPdfLayout } from './pdfLayout'

const MARGIN_MM = 10
const MIN_TRAILING_SPACE_MM = 20
const BLOCK_GAP_MM = 4

export async function exportElementToPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const blocks = collectPdfBlocks(element)
  const canvases = await Promise.all(
    blocks.map((block) =>
      html2canvas(block.el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        // Interactive controls (e.g. the budget auto-trim button) that live inside an
        // otherwise-exportable block shouldn't render into the static PDF.
        ignoreElements: (el) => el.getAttribute('data-pdf-exclude') === 'true',
      }),
    ),
  )

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN_MM * 2

  const heightsMm = canvases.map((canvas) => (canvas.height * contentWidth) / canvas.width)
  const placements = planPdfLayout(
    heightsMm,
    blocks.map((b) => b.isHeading),
    { pageHeightMm: pageHeight, marginMm: MARGIN_MM, minTrailingSpaceMm: MIN_TRAILING_SPACE_MM, blockGapMm: BLOCK_GAP_MM },
  )

  const usableHeight = pageHeight - MARGIN_MM * 2
  let highestPageDrawn = 0

  canvases.forEach((canvas, i) => {
    const { pageIndex, y } = placements[i]
    const heightMm = heightsMm[i]

    while (highestPageDrawn < pageIndex) {
      pdf.addPage()
      highestPageDrawn += 1
    }
    pdf.setPage(pageIndex + 1)

    if (heightMm <= usableHeight) {
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN_MM, MARGIN_MM + y, contentWidth, heightMm)
      return
    }

    // Block taller than a full page: slice it across as many pages as it needs, matching
    // the same page-by-page accounting planPdfLayout used to place the blocks after it.
    const pxPerMm = canvas.height / heightMm
    let sourceY = 0
    let remaining = heightMm
    let currentPage = pageIndex
    let currentY = y

    while (remaining > 0) {
      const spaceOnPage = usableHeight - currentY
      const sliceHeightMm = Math.min(remaining, spaceOnPage)
      const sliceHeightPx = sliceHeightMm * pxPerMm

      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = sliceHeightPx
      const ctx = sliceCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)
        pdf.setPage(currentPage + 1)
        pdf.addImage(
          sliceCanvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          MARGIN_MM,
          MARGIN_MM + currentY,
          contentWidth,
          sliceHeightMm,
        )
      }

      sourceY += sliceHeightPx
      remaining -= sliceHeightMm
      currentY += sliceHeightMm

      if (remaining > 0) {
        currentPage += 1
        currentY = 0
        while (highestPageDrawn < currentPage) {
          pdf.addPage()
          highestPageDrawn += 1
        }
      }
    }
  })

  pdf.save(filename)
}
