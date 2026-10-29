import { Streamdown } from 'streamdown'

import { cn } from '../lib/utils'

export function Markdown({ className, children }: { className?: string; children: string }) {
  return (
    <Streamdown mode="static" className={cn('text-sm leading-relaxed', className)}>
      {children}
    </Streamdown>
  )
}
