import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface ComposerErrorProps {
  errorTextId: string
  message: string
}

export function ComposerError({ errorTextId, message }: ComposerErrorProps) {
  return (
    <Alert
      variant="destructive"
      id={errorTextId}
      className="border-destructive/30 bg-destructive/8 text-foreground mx-3 mb-2 rounded-2xl px-3.5 py-2.5 shadow-sm"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      <AlertDescription className="text-foreground min-w-0 leading-relaxed break-words">
        {message}
      </AlertDescription>
    </Alert>
  )
}
