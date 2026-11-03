const PREVIEW_POLICY =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;">'

export function previewDocument(code: string): string {
  if (/<head[^>]*>/i.test(code)) {
    return code.replace(/<head[^>]*>/i, (tag) => `${tag}${PREVIEW_POLICY}`)
  }

  if (/<html[^>]*>/i.test(code)) {
    return code.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${PREVIEW_POLICY}</head>`)
  }

  return `<!doctype html><html><head>${PREVIEW_POLICY}</head><body>${code}</body></html>`
}
