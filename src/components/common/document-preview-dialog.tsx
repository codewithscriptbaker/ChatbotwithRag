import { AppIconButton } from '@/components/common/app-button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import { cn, truncateFilenameMiddle } from '@/lib/utils'
import { FileText, X } from 'lucide-react'

type DocumentPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string
  sourceLabel?: string
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  content,
  sourceLabel
}: DocumentPreviewDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-background/95 border-border/70 w-[min(92vw,860px)] gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Document preview dialog with full content.
        </DialogDescription>

        <div className="border-border/60 flex items-center gap-3 border-b px-4 py-3 sm:px-5">
          <span className="bg-accent/70 text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-semibold" title={title}>
              {truncateFilenameMiddle(title, 72)}
            </p>
            <p className="text-muted-foreground text-xs">
              {sourceLabel ? `${sourceLabel} attachment` : 'Document attachment'}
            </p>
          </div>
          <DialogClose asChild>
            <AppIconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              touch={false}
              mutedDisabled={false}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/70 ml-auto rounded-full"
              aria-label="Close document preview"
            >
              <X className="size-4" aria-hidden="true" />
            </AppIconButton>
          </DialogClose>
        </div>

        <div className="max-h-[72dvh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <pre
            className={cn(
              'text-foreground text-sm leading-6 whitespace-pre-wrap',
              'font-[ui-sans-serif,system-ui,-apple-system,Segoe_UI,Roboto,Ubuntu,Cantarell,Noto_Sans,sans-serif]'
            )}
          >
            {content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
