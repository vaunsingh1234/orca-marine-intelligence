import type { CSSProperties } from 'react'
import './OceanScene.css'

const MOTES = Array.from({ length: 16 }, (_, index) => {
  // Deterministic pseudo-random placement keeps the scene stable across renders.
  const seed = (index + 1) * 9301
  return {
    left: (seed % 97) + (index % 3),
    top: (seed >> 4) % 100,
    size: 1 + ((seed >> 3) % 3),
    delay: (seed % 17) * 0.9,
    duration: 18 + ((seed >> 5) % 14),
    drift: ((seed >> 7) % 60) - 30,
  }
})

export default function OceanScene() {
  return (
    <div className="ocean" aria-hidden="true">
      <div className="ocean-photo" />
      <div className="ocean-tint" />
      <div className="ocean-rays">
        <span style={{ '--x': '18%', '--w': '150px', '--d': '0s' } as CSSProperties} />
        <span style={{ '--x': '34%', '--w': '96px', '--d': '-7s' } as CSSProperties} />
        <span style={{ '--x': '58%', '--w': '190px', '--d': '-13s' } as CSSProperties} />
        <span style={{ '--x': '76%', '--w': '120px', '--d': '-4s' } as CSSProperties} />
      </div>
      <div className="ocean-motes">
        {MOTES.map((mote, index) => (
          <span
            key={index}
            style={
              {
                left: `${mote.left}%`,
                top: `${mote.top}%`,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                animationDelay: `${mote.delay}s`,
                animationDuration: `${mote.duration}s`,
                '--drift': `${mote.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="ocean-vignette" />
    </div>
  )
}
