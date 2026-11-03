const EXPLAIN_PROMPT = `You critique a UI screenshot for a redesign concept.

Return strictly as JSON matching this shape:
{
  "summary": string,
  "platform": "mobile" | "web" | "desktop" | "unknown",
  "findings": [
    { "label": string, "description": string, "severity": "minor" | "moderate" | "significant", "redesignHint": string }
  ]
}

Rules:
- summary: what this screen is for and how it is laid out, in two sentences.
- platform: your best guess at the device/context from the screenshot's proportions and chrome. Use "unknown" if you can't tell.
- findings: concrete UI/UX problems visible in the screenshot. Consider hierarchy, spacing, contrast, clutter, unclear calls to action, and inconsistent styling, but only when visible.
- redesignHint: for each finding, one short visual instruction describing the fix in terms an image generator can draw (e.g. "increase spacing between list items and left-align prices" rather than "improve spacing").
- Describe only what you can see. If the screenshot is cropped, small, or low quality for a specific judgement, say so in that finding's description instead of inventing one.
- Do not claim measured contrast values. This is a visual judgement.
- No invented product names, brands, data, or metrics.
- No markdown, no prose outside the JSON object.`

const CODE_PROMPT = `Rebuild the attached UI screenshot as a working HTML and CSS page, applying the requested design fixes.

Output:
- Return one complete HTML document, starting with <!DOCTYPE html>. No markdown fences, no prose outside the document.
- Include <meta charset="utf-8"> and <meta name="viewport" content="width=device-width, initial-scale=1">.
- Inline all CSS in a single <style> tag. No external fonts, stylesheets, scripts, or images. Use system font stacks only (e.g. -apple-system, Segoe UI, Roboto, sans-serif).

Fidelity:
- Reproduce the screenshot's layout, spacing, hierarchy, colors, and visible copy as closely as you can, using the screen summary and findings below as context for what the original looked like.
- Apply only the listed fixes. Each fix below includes a redesign hint, translate that hint into actual CSS/layout changes, not just a comment.
- Do not introduce changes beyond the listed fixes, even if you notice other things you'd improve.

Layout and assets:
- Use flexbox or CSS grid for layout, not absolute positioning, so the page reflows sensibly.
- box-sizing: border-box on all elements. body { margin: 0 }, full-width layout sized to the viewport, no fixed pixel-width containers wider than the viewport.
- Never recreate photos, illustrations, or screenshots. Where the original shows an image, render a simple neutral placeholder block (e.g. a muted <div> with a fixed aspect ratio) in the same position. Draw interface icons as inline SVG with no external references: viewBox="0 0 24 24", fill="none", stroke="currentColor", stroke-width 1.5 to 2, round caps and joins, aria-hidden="true". Use familiar Lucide-style shapes for search, menu, bell, user, chevron, check, plus, and similar, and size them with CSS width and height. Prefer SVG over Unicode glyphs or CSS shapes for icons; never invent complex illustrations. For the placeholder block, use a plain muted rectangle only. No <img> tags, no external assets, no icon fonts, and never a broken image.
- No <script> tags, no inline event handler attributes (onclick, onchange, etc.), no <form> with an action or submit behavior. If a fix seems to require interactivity, express it visually only (e.g. a styled toggle in its "on" state) rather than making it functional.

Content:
- Generic placeholder content only. Never invent brands, real people, logos, or real data. Keep text short, matching the original's approximate text length, don't pad with filler sentences.

Context:
Screen summary: {{summary}}
Platform: {{platform}}
Fixes to apply:
{{fixesList}}
{{styleInstruction}}`

type Finding = {
  label: string
  description: string
  severity: string
  redesignHint: string
}

export function buildUiExplainPrompt(): string {
  return EXPLAIN_PROMPT
}

export function buildUiCodePrompt(options: {
  summary: string | null
  platform: string | null
  findings: Array<Finding>
  instruction: string | null
}): string {
  const summary = options.summary ?? 'No summary available.'
  const platform = options.platform ?? 'unknown platform'
  const findings = options.findings
    .map((finding) => `- [${finding.severity}] ${finding.label}: ${finding.redesignHint}`)
    .join('\n')
  const instruction = options.instruction ? `Style request: ${options.instruction}` : ''

  return CODE_PROMPT.replace('{{summary}}', () => summary)
    .replace('{{platform}}', () => platform)
    .replace('{{fixesList}}', () => findings || 'None.')
    .replace('{{styleInstruction}}', () => instruction)
    .trim()
}
