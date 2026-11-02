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

const REDESIGN_PROMPT = `Write one image-generation prompt for a redesigned UI concept.

Rules:
- Open with the platform and screen type only (e.g. "Settings page for a mobile app,"). Never open with a device or browser frame.
- Describe layout, spacing, visual hierarchy, contrast, and the primary call to action, using the redesign hints as the concrete instructions to draw.
- Specify a clean, modern, contemporary product UI style with generous whitespace, crisp typography, and subtle depth.
- Show the screen edge to edge and fill the canvas. No browser chrome, no device frame, no laptop or phone outline.
- Not a photograph, not a 3D render.
- Any on-screen text must be minimal and generic (short labels, placeholder word count), never full sentences or real copy — image models render long text as garbled artifacts, so keep text elements short and sparse.
- Address only the selected findings and the optional style instruction. Don't introduce unrelated changes.
- Keep branding neutral: no logos, no real people, no readable brand names, no real data.
- End with a short palette/typography cue (e.g. "muted blue and white palette, generous whitespace, sans-serif type") so repeated generations stay visually consistent.
- Return a single prompt under 600 characters. No preamble, no quotes.`

type Finding = {
  label: string
  description: string
  severity: string
  redesignHint: string
}

export function buildUiExplainPrompt(): string {
  return EXPLAIN_PROMPT
}

export function buildUiRedesignPrompt(options: {
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

  return `${REDESIGN_PROMPT}\n\nPlatform: ${platform}\nScreen summary:\n${summary}\n\nRedesign instructions to draw:\n${findings || 'None.'}${instruction}`
}
