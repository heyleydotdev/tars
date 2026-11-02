import '../../src/renderer/src/main.css'

document.documentElement.classList.add('dark')
document.body.className = 'bg-background text-foreground'

const stylesheet = document.createElement('style')

stylesheet.textContent = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`

document.head.appendChild(stylesheet)
