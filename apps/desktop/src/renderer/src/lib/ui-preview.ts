const PREVIEW_POLICY =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;">'

const FIX_STYLE =
  '<style>[data-fix]{position:relative;outline:2px solid #fcd34d;outline-offset:2px}[data-fix]:after{content:attr(data-fix) " · " attr(data-fix-why);position:absolute;left:0;top:-1.2em;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 5px;background:#fcd34d;color:#09090b;font:12px/1.35 ui-monospace,monospace;pointer-events:none;z-index:2147483647}[data-fix] [data-fix]{outline:none}[data-fix] [data-fix]:after{content:"";display:none}</style>'

export function previewDocument(code: string, showFixes = false): string {
  const injected = `${PREVIEW_POLICY}${showFixes ? FIX_STYLE : ''}`

  if (/<head(?:\s[^>]*)?>/i.test(code)) {
    return code.replace(/<head(?:\s[^>]*)?>/i, (tag) => `${tag}${injected}`)
  }

  if (/<html[^>]*>/i.test(code)) {
    return code.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${injected}</head>`)
  }

  return `<!doctype html><html><head>${injected}</head><body>${code}</body></html>`
}
