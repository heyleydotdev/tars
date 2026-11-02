import { addIncidentScreenshot, getTimeZone } from './incident'
import { dataUrlToBlob } from './measure'
import { orpc } from './orpc'

const ERROR_PAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520">
<rect width="900" height="520" fill="#0b0f14"/>
<text x="60" y="170" fill="#f87171" font-family="monospace" font-size="58">502 Bad Gateway</text>
<text x="60" y="232" fill="#e5e7eb" font-family="monospace" font-size="22">checkout-api / GET /cart</text>
<text x="60" y="272" fill="#94a3b8" font-family="monospace" font-size="17">upstream connect error or disconnect/reset before headers</text>
<text x="60" y="312" fill="#e5e7eb" font-family="monospace" font-size="30">14:32:07</text>
<text x="60" y="352" fill="#94a3b8" font-family="monospace" font-size="17">request-id 7f3a9c2e</text>
<text x="60" y="392" fill="#64748b" font-family="monospace" font-size="15">retry-after 0 - upstream payment-gateway</text>
</svg>`

const DASHBOARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520">
<rect width="900" height="520" fill="#0b0f14"/>
<text x="40" y="52" fill="#e5e7eb" font-family="monospace" font-size="22">checkout-api - latency</text>
<text x="760" y="60" fill="#e5e7eb" font-family="monospace" font-size="30">14:35</text>
<text x="40" y="80" fill="#94a3b8" font-family="monospace" font-size="16">p99 over the last hour</text>
<line x1="70" y1="440" x2="860" y2="440" stroke="#334155"/>
<line x1="70" y1="130" x2="70" y2="440" stroke="#334155"/>
<text x="24" y="150" fill="#64748b" font-family="monospace" font-size="14">5s</text>
<text x="24" y="430" fill="#64748b" font-family="monospace" font-size="14">0s</text>
<polyline points="70,408 150,406 240,410 330,404 420,180 500,140 580,150 660,136 740,144 820,402" fill="none" stroke="#f87171" stroke-width="3"/>
<text x="505" y="120" fill="#f87171" font-family="monospace" font-size="16">p99 4.8s</text>
<text x="70" y="480" fill="#64748b" font-family="monospace" font-size="18">14:25</text>
<text x="310" y="480" fill="#64748b" font-family="monospace" font-size="18">14:30</text>
<text x="540" y="480" fill="#64748b" font-family="monospace" font-size="18">14:35</text>
<text x="780" y="480" fill="#64748b" font-family="monospace" font-size="18">14:40</text>
</svg>`

const DEMO_EVIDENCE: Array<{ kind: 'log' | 'text'; content: string }> = [
  {
    kind: 'text',
    content:
      'Deploy note: checkout-api v2.41.0 shipped at 14:30. It replaced the cart cache key (cart:v2 -> cart:v3) and adjusted payment retries. No feature flags and no config changes went out with it.'
  },
  {
    kind: 'log',
    content:
      '[14:30:02] deploy checkout-api v2.41.0 finished, rollout 100%\n[14:32:07] GET /cart 502 upstream connect error (x14) from payment-gateway\n[14:36:11] p99 latency 4.8s, baseline 180ms\n[14:40:26] rollback to v2.40.3 started\n[14:44:02] rollback complete, errors stop\n[14:47:10] p99 back to 190ms with no further change'
  }
]

async function svgToPng(svg: string, width: number, height: number): Promise<string> {
  const url = `data:image/svg+xml;base64,${btoa(svg)}`
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()

    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Could not render the demo screenshot.'))
    element.src = url
  })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height

  if (!context) throw new Error('Could not render the demo screenshot.')

  context.fillStyle = '#0b0f14'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/png')
}

export async function seedIncidentDemo(
  onProgress?: (progress: { done: number; total: number; incidentId: string }) => void
): Promise<string> {
  const created = await orpc.incident.create.call({ title: 'Checkout errors after deploy' })
  const incidentId = created.incident.id

  void orpc.journal.logActivity
    .call({
      events: [
        {
          type: 'incident.opened',
          incidentId,
          title: created.incident.title,
          occurredAt: new Date().toISOString()
        }
      ]
    })
    .catch(() => undefined)
  const total = DEMO_EVIDENCE.length + 3
  let done = 0
  const tick = (): void => {
    done += 1
    onProgress?.({ done, total, incidentId })
  }

  onProgress?.({ done, total, incidentId })

  for (const item of DEMO_EVIDENCE) {
    await orpc.incident.addEvidence.call({
      incidentId,
      kind: item.kind,
      content: item.content,
      occurredAt: null,
      timezone: getTimeZone()
    })
    tick()
  }

  const errorPage = await svgToPng(ERROR_PAGE_SVG, 900, 520)

  await addIncidentScreenshot(incidentId, dataUrlToBlob(errorPage))
  tick()

  const dashboard = await svgToPng(DASHBOARD_SVG, 900, 520)

  await addIncidentScreenshot(incidentId, dataUrlToBlob(dashboard))
  tick()

  await orpc.incident.rebuildTimeline.call({ incidentId, timezone: getTimeZone() })
  tick()

  return incidentId
}
