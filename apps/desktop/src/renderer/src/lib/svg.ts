import { downloadBlob } from './download'

export function slug(name: string): string {
  return (
    name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'blueprint'
  )
}

export async function exportSvgPng(svg: SVGSVGElement, name: string): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const markup = new XMLSerializer().serializeToString(clone)
  const source = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = new Image()

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not render the diagram.'))
      image.src = source
    })

    const width = svg.viewBox.baseVal.width || svg.clientWidth
    const height = svg.viewBox.baseVal.height || svg.clientHeight
    const scale = 2
    const canvas = document.createElement('canvas')

    canvas.width = Math.ceil(width * scale)
    canvas.height = Math.ceil(height * scale)

    const context = canvas.getContext('2d')

    if (!context) throw new Error('Could not render the diagram.')

    context.scale(scale, scale)
    context.fillStyle = '#09090b'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

    if (!blob) throw new Error('Could not render the diagram.')

    downloadBlob(blob, `${slug(name)}.png`)
  } finally {
    URL.revokeObjectURL(source)
  }
}
