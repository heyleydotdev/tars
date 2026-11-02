import { Tabs, TabsList, TabsTrigger } from '@tars/ui/components/tabs'
import { cn } from '@tars/ui/lib/utils'

export default function ConsoleTabs({
  value,
  onValueChange,
  items,
  children,
  className,
  fill = true
}: {
  value: string
  onValueChange: (value: string) => void
  items: Array<{ value: string; label: string; count?: number | string }>
  children?: React.ReactNode
  className?: string
  fill?: boolean
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn('flex flex-col gap-0', fill && 'min-h-0 flex-1', className)}
    >
      <TabsList
        variant="line"
        className="border-border h-10 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="flex-none gap-2 rounded-none border-r px-4 text-xs tracking-wide after:inset-x-0 after:bottom-0 after:h-px after:bg-emerald-400"
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="text-muted-foreground tabular-nums">[{item.count}]</span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}
