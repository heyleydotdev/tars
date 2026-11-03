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

Rules:
- Return one complete HTML document. No markdown fences, no prose outside the document.
- Inline all CSS in a single <style> tag. No external fonts, stylesheets, scripts, or images.
- Reproduce the screenshot's layout, spacing, hierarchy, colors, and visible copy as closely as you can. Use system font stacks and CSS only.
- Apply each requested fix. Do not introduce unrelated changes.
- Keep the page self-contained and sized to the viewport: body { margin: 0 } and a full-width layout.
- No <script>, no event handler attributes, no forms that submit.
- Generic placeholder content only; never invent brands, real people, or real data.`

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
  const instruction = options.instruction ? `\nStyle request: ${options.instruction}` : ''

  return `${CODE_PROMPT}\n\nPlatform: ${platform}\nScreen summary:\n${summary}\n\nFixes to apply:\n${findings || 'None.'}${instruction}`
}
