import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { CodeBlock, CodeBlockContent, CodeBlockLine } from '@tars/ui/components/code-block'
import { useHighlightedCode } from '@tars/ui/hooks/use-highlighted-code'

function Sample() {
  const lines = useHighlightedCode('<div class="card">hi</div>', 'html')

  return (
    <CodeBlock>
      <CodeBlockContent>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

test('highlights html code', async () => {
  render(<Sample />)

  await vi.waitFor(
    () => {
      const colored = document.querySelector('[data-slot="code-block-code"] span[style]')
      expect(colored).not.toBeNull()
    },
    { timeout: 10_000 }
  )
})
