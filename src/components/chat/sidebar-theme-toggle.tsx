'use client'

import { useCallback } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useHydrated } from '@/hooks/useHydrated'
import { cn } from '@/lib/utils'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { SidebarMenuButton } from '@/components/ui/sidebar'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
] as const

export function SidebarThemeToggle(): React.JSX.Element | null {
  const { theme, setTheme } = useTheme()
  const mounted = useHydrated()

  const activeIcon = useCallback(() => {
    if (!mounted) return Sun
    if (theme === 'dark') return Moon
    if (theme === 'system') return Monitor
    return Sun
  }, [mounted, theme])

  const activeLabel = useCallback(() => {
    if (!mounted) return 'Theme'
    if (theme === 'dark') return 'Dark'
    if (theme === 'system') return 'System'
    return 'Light'
  }, [mounted, theme])

  const ActiveIcon = activeIcon()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarMenuButton className="h-11 md:h-9">
          <ActiveIcon className="text-sidebar-foreground/70 size-4" aria-hidden="true" />
          <span>{activeLabel()}</span>
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-44 p-1.5"
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wide uppercase">
            Theme
          </p>
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                theme === value
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-foreground/80 hover:bg-muted'
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
              {theme === value && (
                <span className="bg-primary ml-auto size-1.5 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
