function splitMarkdownRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isSeparatorRow(row: string): boolean {
  const cells = splitMarkdownRow(row)
  if (cells.length === 0) return false
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function escapeCsvCell(cell: string): string {
  if (/[",\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`
  }
  return cell
}

export function extractFirstMarkdownTable(markdown: string): string[][] | null {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim())
  let start = -1

  for (let i = 0; i < lines.length - 1; i += 1) {
    const current = lines[i]
    const next = lines[i + 1]
    if (!current || !next) continue
    if (!current.includes('|')) continue
    if (!next.includes('|')) continue
    if (!isSeparatorRow(next)) continue
    start = i
    break
  }

  if (start === -1) return null

  const tableRows: string[][] = []
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line || !line.includes('|')) {
      if (tableRows.length > 0) break
      continue
    }
    if (isSeparatorRow(line)) continue
    tableRows.push(splitMarkdownRow(line))
  }

  if (tableRows.length < 2) return null
  return tableRows
}

export function toCsvContent(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')
}
