import { Tabs, TabsList, TabsTrigger } from '@tars/ui/components/tabs'
import { cn } from '@tars/ui/lib/utils'

export default function PanelTabs({
  defaultValue,
  items,
  className,
  children
}: React.PropsWithChildren<{
  defaultValue: string
  items: Array<{ value: string; label: string }>
  className?: string
}>) {
  return (
    <Tabs defaultValue={defaultValue} className={cn('flex flex-col gap-0', className)}>
      <TabsList
        variant="line"
        className="border-border h-8 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
      >
        {items.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="after:bg-foreground flex-none rounded-none border-r px-3 text-xs tracking-wide last:border-r-0"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}
