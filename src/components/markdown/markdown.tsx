import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { CopyStatusAnnouncement } from '@/components/accessibility/copy-status-announcement'
import { AppIconButton } from '@/components/common/app-button'
import { ButtonWithTooltip } from '@/components/common/button-with-tooltip'
import { ImagePreviewDialog } from '@/components/common/image-preview-dialog'
import { Separator } from '@/components/ui/separator'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { cn } from '@/lib/utils'
import { saveAs } from 'file-saver'
import type { Element, Nodes, Properties, Root } from 'hast'
import { Check, Copy, Download } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { PluggableList } from 'unified'

const HIGHLIGHT_LANGUAGE_ALLOWLIST = new Set([
  'arduino',
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'go',
  'graphql',
  'ini',
  'java',
  'javascript',
  'json',
  'kotlin',
  'less',
  'lua',
  'makefile',
  'markdown',
  'objectivec',
  'perl',
  'php',
  'php-template',
  'plaintext',
  'python',
  'python-repl',
  'r',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'vbnet',
  'wasm',
  'xml',
  'yaml'
])

const HIGHLIGHT_LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  html: 'xml',
  svg: 'xml',
  md: 'markdown',
  'c++': 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  objc: 'objectivec',
  txt: 'plaintext',
  text: 'plaintext',
  plain: 'plaintext'
}

function normalizeHighlightLanguage(input: string): string {
  const language = input.trim().toLowerCase()
  return HIGHLIGHT_LANGUAGE_ALIASES[language] ?? language
}

const WHITESPACE_REGEX = /\s+/

function getClassList(rawClassName: Properties[string]): string[] {
  if (Array.isArray(rawClassName)) {
    return rawClassName.filter(
      (value: string | number): value is string => typeof value === 'string'
    )
  }

  if (typeof rawClassName === 'string') {
    return rawClassName.split(WHITESPACE_REGEX).filter(Boolean)
  }

  return []
}

function getHighlightLanguage(classList: string[]): string | null {
  const languageClass = classList.find((value) => value.startsWith('language-'))

  if (!languageClass) {
    return null
  }

  const normalized = normalizeHighlightLanguage(languageClass.slice('language-'.length))
  return HIGHLIGHT_LANGUAGE_ALLOWLIST.has(normalized) ? normalized : null
}

function rehypeNormalizeCodeLanguage(): (tree: Root) => void {
  return function transformer(tree: Root): void {
    const visit = (node: Nodes): void => {
      if (node.type === 'element' && node.tagName === 'code') {
        const rawClassName = node.properties['className'] ?? node.properties['class']
        const classList = getClassList(rawClassName)

        const languageClassIndex = classList.findIndex((c) => c.startsWith('language-'))

        if (languageClassIndex !== -1) {
          const normalized = getHighlightLanguage(classList)

          if (normalized) {
            classList[languageClassIndex] = `language-${normalized}`
          } else {
            classList.splice(languageClassIndex, 1)
          }

          if (classList.length > 0) node.properties['className'] = classList
          else delete node.properties['className']
        }
      }

      if ('children' in node) {
        for (const child of (node as Element).children) visit(child)
      }
    }

    visit(tree)
  }
}

const remarkPluginList: PluggableList = [remarkGfm]

const rehypePluginList: PluggableList = [
  rehypeNormalizeCodeLanguage,
  [rehypeHighlight, { detect: false }]
]

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement(node) && node.props) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return String(node ?? '')
}

function extractLanguage(children: React.ReactNode): string | null {
  const child = Array.isArray(children) ? children[0] : children
  if (!isValidElement(child)) return null

  const className = (child.props as { className?: string | string[] }).className
  return getHighlightLanguage(getClassList(className))
}

function toCsvContent(rows: string[][]): string {
  const escapeCsvCell = (cell: string): string =>
    /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell

  return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n')
}

function toMarkdownTableContent(rows: string[][]): string {
  if (rows.length === 0) return ''

  const header = rows[0]
  const dataRows = rows.slice(1)
  const separator = header.map(() => '---')

  const asMarkdownRow = (row: string[]): string => `| ${row.join(' | ')} |`

  return [asMarkdownRow(header), asMarkdownRow(separator), ...dataRows.map(asMarkdownRow)].join(
    '\n'
  )
}

function CodeBlockCopyButton({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { copy, copied } = useCopyToClipboard()
  const handleCopy = useCallback(() => {
    void copy(extractText(children))
  }, [copy, children])

  return (
    <>
      <AppIconButton
        type="button"
        size="icon-sm"
        variant="ghost"
        touch={false}
        mutedDisabled={false}
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground hover:bg-primary/5 size-11 shrink-0 md:size-7"
        aria-label={copied ? 'Code copied to clipboard' : 'Copy code'}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </AppIconButton>
      <CopyStatusAnnouncement copied={copied} message="Code copied to clipboard." />
    </>
  )
}

interface MarkdownImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  previewEnabled?: boolean
}

function MarkdownImage({
  src,
  alt,
  previewEnabled = true
}: MarkdownImageProps): React.JSX.Element | null {
  const [previewOpen, setPreviewOpen] = useState(false)

  if (typeof src !== 'string' || src.length === 0) {
    return null
  }

  const imageAlt = typeof alt === 'string' && alt.length > 0 ? alt : 'Image'
  const imageClassName =
    'border-border/60 max-h-[28rem] w-auto max-w-full rounded-lg border object-contain transition-opacity duration-200 hover:opacity-95'

  if (!previewEnabled) {
    return (
      // Markdown image URLs can be remote; native image avoids domain config coupling.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
        className={cn('my-3', imageClassName)}
      />
    )
  }

  return (
    <>
      <button
        type="button"
        className="focus-visible:ring-ring/60 focus-visible:ring-offset-background my-3 block rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Open image preview"
        onClick={() => setPreviewOpen(true)}
      >
        {/* Markdown image URLs can be remote; native image avoids domain config coupling. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={imageAlt} loading="lazy" decoding="async" className={imageClassName} />
      </button>
      {previewOpen ? (
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          src={src}
          alt={imageAlt}
        />
      ) : null}
    </>
  )
}

function disablePreviewForLinkedImages(children: React.ReactNode): React.ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child
    }

    if (child.type === MarkdownImage) {
      return cloneElement(child as React.ReactElement<MarkdownImageProps>, {
        previewEnabled: false
      })
    }

    const childProps = child.props as { children?: React.ReactNode }
    if (!childProps.children) {
      return child
    }

    return cloneElement(child, undefined, disablePreviewForLinkedImages(childProps.children))
  })
}

export interface MarkdownProps {
  className?: string
  children: string
  renderLinkAnnotation?: (href: string) => ReactNode | null
}

const STATIC_COMPONENTS: Components = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-8 mb-3 scroll-mt-24 text-[1.625rem] font-semibold tracking-tight text-balance first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-7 mb-3 scroll-mt-24 text-[1.375rem] font-semibold tracking-tight text-balance first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-6 mb-2.5 scroll-mt-24 text-[1.125rem] font-semibold tracking-tight text-balance first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-5 mb-2 scroll-mt-24 text-base font-semibold tracking-tight text-balance first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 leading-7 text-pretty last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="marker:text-muted-foreground mb-4 list-disc pl-6 leading-7 [&>li+li]:mt-1.5">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="marker:text-muted-foreground mb-4 list-decimal pl-6 leading-7 [&>li+li]:mt-1.5">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="pl-1">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="text-muted-foreground border-border my-4 border-l-2 pl-4 leading-7">
      {children}
    </blockquote>
  ),
  hr: () => <Separator className="my-5" />,
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = className?.includes('language-') || className?.includes('hljs')
    if (isBlock) {
      return <code className={cn('text-[13px] leading-6', className)}>{children}</code>
    }
    return (
      <code className="bg-muted/60 text-foreground border-border/50 rounded-md border px-1.5 py-[0.15rem] font-mono text-[0.85em]">
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: React.ReactNode }) => {
    const language = extractLanguage(children)
    return (
      <div className="bg-muted/70 border-border/60 my-4 overflow-hidden rounded-xl border shadow-xs">
        {language && (
          <div className="border-border/60 bg-muted/80 flex items-center justify-between border-b px-3.5 py-2.5">
            <div className="text-muted-foreground/90 flex items-center gap-1.5 text-[11px] tracking-wide uppercase select-none">
              <span className="capitalize">{language}</span>
            </div>
            <CodeBlockCopyButton>{children}</CodeBlockCopyButton>
          </div>
        )}
        <div className="relative">
          {!language && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <CodeBlockCopyButton>{children}</CodeBlockCopyButton>
            </div>
          )}
          <pre className="overflow-x-auto p-4 text-[13px] leading-6">{children}</pre>
        </div>
      </div>
    )
  },
  table: ({ children }: { children?: React.ReactNode }) => {
    const tableRef = useRef<HTMLTableElement | null>(null)
    const { copy, copied } = useCopyToClipboard()

    const extractRowsFromTable = useCallback((): string[][] => {
      const table = tableRef.current
      if (!table) return []

      const rows: string[][] = []
      const rowElements = table.querySelectorAll('tr')

      for (const row of rowElements) {
        const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
          (cell.textContent || '').trim()
        )
        if (cells.length > 0) {
          rows.push(cells)
        }
      }

      return rows
    }, [])

    const handleDownload = useCallback(() => {
      const rows = extractRowsFromTable()
      if (rows.length < 2) return
      const csvContent = toCsvContent(rows)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      saveAs(blob, `table-export-${Date.now()}.csv`)
    }, [extractRowsFromTable])

    const handleCopyTable = useCallback(() => {
      const rows = extractRowsFromTable()
      if (rows.length < 2) return
      const markdownTable = toMarkdownTableContent(rows)
      void copy(markdownTable)
    }, [copy, extractRowsFromTable])

    return (
      <div className="border-border/70 my-4 overflow-hidden rounded-xl border shadow-xs">
        <div className="border-border/60 bg-muted/60 flex items-center justify-end gap-1 border-b px-2 py-1.5">
          <ButtonWithTooltip label={copied ? 'Copied table' : 'Copy table (markdown format)'}>
            <AppIconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              touch={false}
              mutedDisabled={false}
              className="text-muted-foreground hover:text-foreground size-8 transition-colors"
              onClick={handleCopyTable}
              aria-label={copied ? 'Table copied' : 'Copy table as markdown'}
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </AppIconButton>
          </ButtonWithTooltip>
          <ButtonWithTooltip label="Download table as CSV">
            <AppIconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              touch={false}
              mutedDisabled={false}
              className="text-muted-foreground hover:text-foreground size-8 transition-colors"
              onClick={handleDownload}
              aria-label="Download table as CSV"
            >
              <Download className="size-4" aria-hidden="true" />
            </AppIconButton>
          </ButtonWithTooltip>
          <CopyStatusAnnouncement copied={copied} message="Table copied to clipboard." />
        </div>
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      </div>
    )
  },
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/60">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-border border-b last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="text-foreground px-3.5 py-2.5 text-left text-sm font-semibold whitespace-nowrap tabular-nums">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="text-foreground px-3.5 py-2.5 align-top text-sm leading-6 tabular-nums">
      {children}
    </td>
  ),
  img: (props) => <MarkdownImage {...props} />
}

function createMarkdownComponents(
  renderLinkAnnotation?: (href: string) => ReactNode | null
): Components {
  return {
    ...STATIC_COMPONENTS,
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      const linkChildren = disablePreviewForLinkedImages(children)
      const link = (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary decoration-primary/60 hover:decoration-primary focus-visible:ring-ring/50 focus-visible:ring-offset-background rounded-sm underline underline-offset-2 hover:decoration-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {linkChildren}
        </a>
      )

      if (!href || !renderLinkAnnotation) {
        return link
      }

      const annotation = renderLinkAnnotation(href)
      if (annotation == null) {
        return link
      }

      return (
        <>
          {link}
          {annotation}
        </>
      )
    }
  }
}

export const Markdown = memo(function Markdown({
  className,
  children,
  renderLinkAnnotation
}: MarkdownProps): React.JSX.Element {
  const components = useMemo(
    () => createMarkdownComponents(renderLinkAnnotation),
    [renderLinkAnnotation]
  )

  return (
    <div className={cn('markdown-body max-w-none leading-7 break-words', className)}>
      <ReactMarkdown
        remarkPlugins={remarkPluginList}
        rehypePlugins={rehypePluginList}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
})
