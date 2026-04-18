import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StatusPageShellProps = {
  title: string
  description: string
  illustration?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  descriptionClassName?: string
  actionsClassName?: string
}

export function StatusPageShell({
  title,
  description,
  illustration,
  actions,
  className,
  contentClassName,
  descriptionClassName,
  actionsClassName
}: StatusPageShellProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-[calc(100dvh-4rem)] flex-1 flex-col items-center justify-center pt-[env(safe-area-inset-top)] pr-[max(env(safe-area-inset-right),1rem)] pb-[env(safe-area-inset-bottom)] pl-[max(env(safe-area-inset-left),1rem)] text-center',
        className
      )}
    >
      {illustration ? (
        <div className="relative mb-8" aria-hidden="true">
          {illustration}
        </div>
      ) : null}
      <div
        className={cn(
          'bg-card/80 border-border/70 flex w-full max-w-xl flex-col gap-3 rounded-2xl border px-5 py-7 shadow-sm backdrop-blur-[1px] md:px-8 md:py-9',
          contentClassName
        )}
      >
        <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {title}
        </h1>
        <p
          className={cn(
            'text-muted-foreground mx-auto max-w-md text-center text-sm/relaxed text-pretty',
            descriptionClassName
          )}
        >
          {description}
        </p>
      </div>
      {actions ? (
        <div className={cn('mt-10 flex flex-wrap justify-center gap-3', actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
