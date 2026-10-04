import qrcode from 'qrcode-generator'

export function QR({ text, size = 160, label }: { text: string; size?: number; label: string }) {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  const n = q.getModuleCount()
  let d = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} fill="#fff" />
      <path d={d} fill="#13252A" />
    </svg>
  )
}

