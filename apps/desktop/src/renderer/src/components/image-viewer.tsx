import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/styles.css'

export type ViewerImage = {
  src: string
  title?: string
  description?: string
}

export default function ImageViewer({
  image,
  onClose
}: {
  image: ViewerImage | null
  onClose: () => void
}) {
  return (
    <Lightbox
      open={image !== null}
      close={onClose}
      slides={image ? [image] : []}
      plugins={[Captions, Zoom]}
      carousel={{ finite: true, imageFit: 'contain', padding: 24 }}
      controller={{ closeOnBackdropClick: true }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      styles={{
        root: {
          top: 'var(--title-bar-height)',
          bottom: 'auto',
          height: 'calc(100svh - var(--title-bar-height))'
        },
        container: { backgroundColor: 'rgba(9, 9, 11, 0.96)' }
      }}
    />
  )
}
