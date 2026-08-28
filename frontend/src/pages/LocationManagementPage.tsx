import { useEffect, useState, type FormEvent } from 'react'
import OceanScene from '../components/OceanScene'
import {
  BrandMark,
  ChevronLeftIcon,
  LogoutIcon,
  PinIcon,
} from '../components/Icons'
import type { Session } from '../auth/store'
import { listVessels, type Vessel } from '../vessels/api'
import {
  createLocation,
  deleteLocation,
  getLocation,
  listLocations,
  LocationApiError,
  type LocationRecord,
} from '../locations/api'
import './VesselManagementPage.css'
import './LocationManagementPage.css'

type LocationManagementPageProps = {
  session: Session
  onSignOut: () => void
  onBack: () => void
}

type FormState = {
  vesselChoice: string
  customVessel: string
  latitude: string
  longitude: string
  location_name: string
}

const CUSTOM_VESSEL = '__custom__'

const EMPTY_FORM: FormState = {
  vesselChoice: '',
  customVessel: '',
  latitude: '',
  longitude: '',
  location_name: '',
}

export default function LocationManagementPage({
  session,
  onSignOut,
  onBack,
}: LocationManagementPageProps) {
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [listError, setListError] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<LocationRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<LocationRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const firstName = session.name.trim().split(/\s+/).filter(Boolean)[0] || 'O'

  async function refreshList() {
    setListStatus('loading')
    setListError('')
    try {
      const rows = await listLocations()
      setLocations(rows)
      setListStatus('ready')
    } catch (caught) {
      setListStatus('error')
      setListError(
        caught instanceof LocationApiError ? caught.message : 'Could not load locations.',
      )
    }
  }

  useEffect(() => {
    void refreshList()
    void listVessels()
      .then(setVessels)
      .catch(() => setVessels([]))
  }, [])

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function resolveVesselName() {
    if (form.vesselChoice && form.vesselChoice !== CUSTOM_VESSEL) return form.vesselChoice.trim()
    return form.customVessel.trim()
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const vesselName = resolveVesselName()
    if (!vesselName) {
      setFormError('Vessel name is required.')
      return
    }
    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setFormError('Latitude must be a number between -90 and 90.')
      return
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setFormError('Longitude must be a number between -180 and 180.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await createLocation({
        vessel_name: vesselName,
        latitude,
        longitude,
        location_name: form.location_name.trim() || undefined,
      })
      setFormOpen(false)
      setForm(EMPTY_FORM)
      setNotice('Location saved.')
      await refreshList()
    } catch (caught) {
      setFormError(
        caught instanceof LocationApiError ? caught.message : 'Could not save this location.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function openDetails(location: LocationRecord) {
    setDetail(location)
    setDetailError('')
    setDetailLoading(true)
    try {
      const fresh = await getLocation(location.id)
      setDetail(fresh)
    } catch (caught) {
      setDetailError(
        caught instanceof LocationApiError ? caught.message : 'Could not load location details.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteLocation(pendingDelete.id)
      setNotice('Location removed.')
      setPendingDelete(null)
      if (detail?.id === pendingDelete.id) setDetail(null)
      await refreshList()
    } catch (caught) {
      setNotice('')
      setListError(
        caught instanceof LocationApiError ? caught.message : 'Could not delete this location.',
      )
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const showCustomVessel = vessels.length === 0 || form.vesselChoice === CUSTOM_VESSEL

  return (
    <div className="vm">
      <OceanScene />

      <div className="vm-layer">
        <header className="vm-top">
          <div className="vm-top-start">
            <button type="button" className="vm-back" onClick={onBack} aria-label="Back to workspace">
              <ChevronLeftIcon />
            </button>
            <div className="brand">
              <BrandMark className="brand-mark" width={34} height={34} />
              <div>
                <p className="brand-name">ORCA</p>
                <p className="brand-sub">Marine Intelligence</p>
              </div>
            </div>
          </div>

          <div className="vm-user">
            <span className="vm-avatar" aria-hidden="true">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <button type="button" className="vm-signout" onClick={onSignOut}>
              <LogoutIcon width={18} height={18} />
              Sign out
            </button>
          </div>
        </header>

        <main className="vm-main">
          <section className="vm-hero">
            <p className="vm-kicker">
              <PinIcon width={15} height={15} />
              Vessel tracking
            </p>
            <div className="vm-hero-row">
              <div>
                <h1>Location Management</h1>
                <p className="vm-lede">
                  Record where a vessel was observed. Positions are stored with a vessel name,
                  coordinates, and an optional place description.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary vm-add"
                onClick={() => {
                  setNotice('')
                  setFormError('')
                  setForm({
                    ...EMPTY_FORM,
                    vesselChoice: vessels[0]?.name ?? CUSTOM_VESSEL,
                  })
                  setFormOpen(true)
                }}
              >
                <PinIcon width={18} height={18} />
                Add location
              </button>
            </div>
          </section>

          {notice ? <p className="vm-notice">{notice}</p> : null}

          {listStatus === 'loading' ? <p className="vm-state">Loading locations…</p> : null}

          {listStatus === 'error' ? (
            <div className="vm-state vm-state-error" role="alert">
              <p>{listError}</p>
              <button type="button" className="link-btn" onClick={() => void refreshList()}>
                Retry
              </button>
            </div>
          ) : null}

          {listStatus === 'ready' && locations.length === 0 ? (
            <div className="vm-empty">
              <PinIcon width={28} height={28} />
              <h2>No locations yet</h2>
              <p>Add the first position report to start tracking vessels.</p>
            </div>
          ) : null}

          {listStatus === 'ready' && locations.length > 0 ? (
            <div className="vm-table-wrap">
              <table className="vm-table">
                <thead>
                  <tr>
                    <th>Vessel</th>
                    <th>Place</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Created</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td>
                        <button
                          type="button"
                          className="vm-name"
                          onClick={() => void openDetails(location)}
                        >
                          {location.vessel_name}
                        </button>
                      </td>
                      <td>{location.location_name || '—'}</td>
                      <td>{formatCoord(location.latitude)}</td>
                      <td>{formatCoord(location.longitude)}</td>
                      <td>{formatCreatedAt(location.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="link-btn vm-delete"
                          onClick={() => {
                            setNotice('')
                            setPendingDelete(location)
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </main>
      </div>

      {formOpen ? (
        <div className="vm-overlay" role="presentation" onClick={closeForm}>
          <section
            className="vm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lm-add-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="lm-add-title">Add location</h2>
            <p>Vessel name, latitude, and longitude are required.</p>
            <form className="vm-form" onSubmit={onCreate}>
              {vessels.length > 0 ? (
                <label className="vm-field">
                  <span>Vessel</span>
                  <select
                    value={form.vesselChoice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, vesselChoice: event.target.value }))
                    }
                  >
                    {vessels.map((vessel) => (
                      <option key={vessel.id} value={vessel.name}>
                        {vessel.name}
                      </option>
                    ))}
                    <option value={CUSTOM_VESSEL}>Other vessel name…</option>
                  </select>
                </label>
              ) : null}
              {showCustomVessel ? (
                <label className="vm-field">
                  <span>Vessel name</span>
                  <input
                    value={form.customVessel}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, customVessel: event.target.value }))
                    }
                    placeholder="e.g. MFV Sagar Kanya"
                    autoComplete="off"
                    required={vessels.length === 0}
                  />
                </label>
              ) : null}
              <div className="lm-coords">
                <label className="vm-field">
                  <span>Latitude</span>
                  <input
                    value={form.latitude}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, latitude: event.target.value }))
                    }
                    placeholder="18.9388"
                    inputMode="decimal"
                    required
                  />
                </label>
                <label className="vm-field">
                  <span>Longitude</span>
                  <input
                    value={form.longitude}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, longitude: event.target.value }))
                    }
                    placeholder="72.8354"
                    inputMode="decimal"
                    required
                  />
                </label>
              </div>
              <label className="vm-field">
                <span>Location name</span>
                <input
                  value={form.location_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location_name: event.target.value }))
                  }
                  placeholder="Optional, e.g. Mumbai harbour approach"
                  autoComplete="off"
                />
              </label>
              {formError ? (
                <p className="vm-form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="vm-dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save location'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {detail ? (
        <div className="vm-overlay" role="presentation" onClick={() => setDetail(null)}>
          <section
            className="vm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lm-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="lm-detail-title">{detail.vessel_name}</h2>
            {detailLoading ? <p className="vm-state">Loading details…</p> : null}
            {detailError ? (
              <p className="vm-form-error" role="alert">
                {detailError}
              </p>
            ) : null}
            {!detailLoading ? (
              <dl className="vm-details">
                <div>
                  <dt>Vessel name</dt>
                  <dd>{detail.vessel_name}</dd>
                </div>
                <div>
                  <dt>Location name</dt>
                  <dd>{detail.location_name || '—'}</dd>
                </div>
                <div>
                  <dt>Latitude</dt>
                  <dd>{formatCoord(detail.latitude)}</dd>
                </div>
                <div>
                  <dt>Longitude</dt>
                  <dd>{formatCoord(detail.longitude)}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatCreatedAt(detail.created_at)}</dd>
                </div>
                <div>
                  <dt>ID</dt>
                  <dd>{detail.id}</dd>
                </div>
              </dl>
            ) : null}
            <div className="vm-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="vm-overlay"
          role="presentation"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <section
            className="vm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="lm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="lm-delete-title">Delete location?</h2>
            <p>
              Remove the position for <strong>{pendingDelete.vessel_name}</strong>
              {pendingDelete.location_name ? ` at ${pendingDelete.location_name}` : ''}? This cannot
              be undone.
            </p>
            <div className="vm-dialog-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary vm-danger"
                onClick={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete location'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatCoord(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : String(value)
}
