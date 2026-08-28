import { useEffect, useRef, useState } from 'react'
import {
  BellIcon,
  BoatIcon,
  BrandMark,
  ChevronDownIcon,
  CompassIcon,
  CloudRainIcon,
  LogoutIcon,
  PinIcon,
  SparkIcon,
  WavesIcon,
} from './Icons'
import { formatPhone, type Session } from '../auth/store'
import type { MarineConditions } from '../marine/useMarineConditions'

type FishermanNavProps = {
  session: Session
  marine: MarineConditions
  onSignOut: () => void
  onBrandClick?: () => void
  onOpenVessels?: () => void
  onOpenLocations?: () => void
}

export default function FishermanNav({
  session,
  marine,
  onSignOut,
  onBrandClick,
  onOpenVessels,
  onOpenLocations,
}: FishermanNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const alertsRef = useRef<HTMLDivElement | null>(null)
  const firstName = session.name.trim().split(/\s+/).filter(Boolean)[0]
  const initial = (firstName || session.name || 'O').slice(0, 1).toUpperCase()

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (!menuRef.current?.contains(target)) setMenuOpen(false)
      if (!alertsRef.current?.contains(target)) setAlertsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <header className="fh-nav">
      {onBrandClick ? (
        <button type="button" className="brand fh-brand-btn" onClick={onBrandClick}>
          <BrandMark className="brand-mark" width={34} height={34} />
          <div>
            <p className="brand-name">ORCA</p>
            <p className="brand-sub">Marine Intelligence</p>
          </div>
        </button>
      ) : (
        <div className="brand">
          <BrandMark className="brand-mark" width={34} height={34} />
          <div>
            <p className="brand-name">ORCA</p>
            <p className="brand-sub">Marine Intelligence</p>
          </div>
        </div>
      )}

      <div className="fh-nav-end">
        <LocationPill marine={marine} />
        <WeatherPill marine={marine} />

        <div className="fh-menu" ref={alertsRef}>
          <button
            type="button"
            className="fh-icon-btn"
            aria-label="Notifications"
            aria-expanded={alertsOpen}
            onClick={() => {
              setAlertsOpen((open) => !open)
              setMenuOpen(false)
            }}
          >
            <BellIcon />
          </button>
          {alertsOpen ? (
            <div className="fh-popover" role="status">
              No new alerts for your waters.
            </div>
          ) : null}
        </div>

        <div className="fh-menu" ref={menuRef}>
          <button
            type="button"
            className="fh-profile"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setMenuOpen((open) => !open)
              setAlertsOpen(false)
            }}
          >
            <span className="fh-avatar">{initial}</span>
            <span className="fh-profile-meta">
              <strong>{session.name || 'Fisherman'}</strong>
              <small>Fisherman</small>
            </span>
            <ChevronDownIcon width={16} height={16} />
          </button>
          {menuOpen ? (
            <div className="fh-popover fh-popover-menu" role="menu">
              <p>{session.email || formatPhone(session.phone)}</p>
              {onOpenVessels ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenVessels()
                  }}
                >
                  <BoatIcon width={16} height={16} />
                  Vessel management
                </button>
              ) : null}
              {onOpenLocations ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenLocations()
                  }}
                >
                  <CompassIcon width={16} height={16} />
                  Location tracking
                </button>
              ) : null}
              <button type="button" role="menuitem" onClick={onSignOut}>
                <LogoutIcon width={16} height={16} />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function LocationPill({ marine }: { marine: MarineConditions }) {
  if (marine.locationStatus === 'locating') {
    return (
      <div className="fh-pill">
        <PinIcon width={16} height={16} />
        <span>Detecting location...</span>
      </div>
    )
  }

  if (marine.locationStatus === 'ready' && marine.placeLabel) {
    return (
      <div className="fh-pill">
        <PinIcon width={16} height={16} />
        <span>{marine.placeLabel}</span>
      </div>
    )
  }

  if (marine.locationStatus === 'denied' || marine.locationStatus === 'unavailable') {
    return (
      <button type="button" className="fh-pill fh-pill-action" onClick={() => void marine.requestLocation()}>
        <PinIcon width={16} height={16} />
        <span>
          Location unavailable
          <em>Enable location</em>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className="fh-pill fh-pill-action"
      title="ORCA uses your location to provide local marine conditions and recommendations."
      onClick={() => void marine.requestLocation()}
    >
      <PinIcon width={16} height={16} />
      <span>
        Allow location access
        <em>For local marine conditions</em>
      </span>
    </button>
  )
}

function WeatherPill({ marine }: { marine: MarineConditions }) {
  if (marine.locationStatus !== 'ready' && marine.weatherStatus === 'idle') return null

  if (marine.weatherStatus === 'loading' || (marine.locationStatus === 'ready' && marine.weatherStatus === 'idle')) {
    return (
      <div className="fh-pill">
        <CloudRainIcon width={16} height={16} />
        <span>Loading weather...</span>
      </div>
    )
  }

  if (marine.weatherStatus === 'error') {
    return (
      <button type="button" className="fh-pill fh-pill-action" onClick={() => marine.retryWeather()}>
        <CloudRainIcon width={16} height={16} />
        <span>
          Weather unavailable
          <em>Retry</em>
        </span>
      </button>
    )
  }

  if (marine.weatherStatus === 'ready' && marine.weather) {
    return (
      <div className="fh-pill">
        {weatherGlyph(marine.weather.weatherCode)}
        <span>
          <strong>{marine.weather.temperatureC}°C</strong>
          {marine.weather.condition}
        </span>
      </div>
    )
  }

  return null
}

function weatherGlyph(code: number) {
  const props = { width: 16, height: 16 }
  if (code === 0 || code === 1) return <SparkIcon {...props} />
  if (code >= 51) return <CloudRainIcon {...props} />
  return <WavesIcon {...props} />
}
