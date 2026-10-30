import ConsolePanel from './console-panel'

export default function StatsPanel({
  title,
  count,
  accent,
  className,
  children
}: React.PropsWithChildren<{
  title: string
  count: string
  accent: string
  className?: string
}>) {
  return (
    <ConsolePanel title={title} count={count} accent={accent} className={className}>
      {children}
    </ConsolePanel>
  )
}
