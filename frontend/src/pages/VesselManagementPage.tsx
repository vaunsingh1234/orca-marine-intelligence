import { useEffect, useState, type FormEvent } from 'react'
import OceanScene from '../components/OceanScene'
import {
  BoatIcon,
  BrandMark,
  ChevronLeftIcon,
  LogoutIcon,
  WavesIcon,
} from '../components/Icons'
import type { Session } from '../auth/store'
import {
  createVessel,
  deleteVessel,
  getVessel,
  listVessels,
  VesselApiError,
  type Vessel,
} from '../vessels/api'
import './VesselManagementPage.css'

type VesselManagementPageProps = {
  session: Session
  onSignOut: () => void
  onBack: () => void
}

type FormState = {
  name: string
  vessel_type: string
  registration_number: string
  home_port: string
}

const EMPTY_FORM: FormState = {
  name: '',
  vessel_type: '',
  registration_number: '',
  home_port: '',
}

export default function VesselManagementPage({
  session,
  onSignOut,
  onBack,
}: VesselManagementPageProps) {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [listError, setListError] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Vessel | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Vessel | null>(null)
  const [deleting, setDeleting] = useState(false)

  const firstName = session.name.trim().split(/\s+/).filter(Boolean)[0] || 'O'

  async function refreshList() {
    setListStatus('loading')
    setListError('')
    try {
      const rows = await listVessels()
      setVessels(rows)
      setListStatus('ready')
    } catch (caught) {
      setListStatus('error')
      setListError(
        caught instanceof VesselApiError ? caught.message : 'Could not load vessels.',
      )
    }
  }

  useEffect(() => {
    void refreshList()
  }, [])

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setFormError('Vessel name is required.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await createVessel({
        name,
        vessel_type: form.vessel_type.trim() || undefined,
        registration_number: form.registration_number.trim() || undefined,
        home_port: form.home_port.trim() || undefined,
      })
      setFormOpen(false)
      setForm(EMPTY_FORM)
      setNotice('Vessel added to the registry.')
      await refreshList()
    } catch (caught) {
      setFormError(caught instanceof VesselApiError ? caught.message : 'Could not add this vessel.')
    } finally {
      setSaving(false)
    }
  }

  async function openDetails(vessel: Vessel) {
    setDetail(vessel)
    setDetailError('')
    setDetailLoading(true)
    try {
      const fresh = await getVessel(vessel.id)
      setDetail(fresh)
    } catch (caught) {
      setDetailError(
        caught instanceof VesselApiError ? caught.message : 'Could not load vessel details.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteVessel(pendingDelete.id)
      setNotice(`${pendingDelete.name} was removed from the registry.`)
      setPendingDelete(null)
      if (detail?.id === pendingDelete.id) setDetail(null)
      await refreshList()
    } catch (caught) {
      setNotice('')
      setListError(caught instanceof VesselApiError ? caught.message : 'Could not delete this vessel.')
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

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
              <WavesIcon width={15} height={15} />
              Fleet registry
            </p>
            <div className="vm-hero-row">
              <div>
                <h1>Vessel Management</h1>
                <p className="vm-lede">
                  Register fishing and maritime vessels, then keep their identity on file for
                  location tracking and marine decision support.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary vm-add"
                onClick={() => {
                  setNotice('')
                  setFormError('')
                  setFormOpen(true)
                }}
              >
                <BoatIcon width={18} height={18} />
                Add vessel
              </button>
            </div>
          </section>

          {notice ? <p className="vm-notice">{notice}</p> : null}

          {listStatus === 'loading' ? (
            <p className="vm-state">Loading vessels…</p>
          ) : null}

          {listStatus === 'error' ? (
            <div className="vm-state vm-state-error" role="alert">
              <p>{listError}</p>
              <button type="button" className="link-btn" onClick={() => void refreshList()}>
                Retry
              </button>
            </div>
          ) : null}

          {listStatus === 'ready' && vessels.length === 0 ? (
            <div className="vm-empty">
              <BoatIcon width={28} height={28} />
              <h2>No vessels yet</h2>
              <p>Add the first vessel to start building the ORCA fleet registry.</p>
            </div>
          ) : null}

          {listStatus === 'ready' && vessels.length > 0 ? (
            <div className="vm-table-wrap">
              <table className="vm-table">
                <thead>
                  <tr>
                    <th>Vessel name</th>
                    <th>Type</th>
                    <th>Registration</th>
                    <th>Home port</th>
                    <th>Created</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vessels.map((vessel) => (
                    <tr key={vessel.id}>
                      <td>
                        <button type="button" className="vm-name" onClick={() => void openDetails(vessel)}>
                          {vessel.name}
                        </button>
                      </td>
                      <td>{vessel.vessel_type || '—'}</td>
                      <td>{vessel.registration_number || '—'}</td>
                      <td>{vessel.home_port || '—'}</td>
                      <td>{formatCreatedAt(vessel.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="link-btn vm-delete"
                          onClick={() => {
                            setNotice('')
                            setPendingDelete(vessel)
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
            aria-labelledby="vm-add-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="vm-add-title">Add vessel</h2>
            <p>Name is required. Other fields can be added later.</p>
            <form className="vm-form" onSubmit={onCreate}>
              <label className="vm-field">
                <span>Vessel name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. MFV Sagar Kanya"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="vm-field">
                <span>Vessel type</span>
                <input
                  value={form.vessel_type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, vessel_type: event.target.value }))
                  }
                  placeholder="Fishing, research, commercial…"
                  autoComplete="off"
                />
              </label>
              <label className="vm-field">
                <span>Registration number</span>
                <input
                  value={form.registration_number}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, registration_number: event.target.value }))
                  }
                  placeholder="Optional, must be unique"
                  autoComplete="off"
                />
              </label>
              <label className="vm-field">
                <span>Home port</span>
                <input
                  value={form.home_port}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, home_port: event.target.value }))
                  }
                  placeholder="e.g. Mumbai"
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
                  {saving ? 'Saving…' : 'Save vessel'}
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
            aria-labelledby="vm-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="vm-detail-title">{detail.name}</h2>
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
                  <dd>{detail.name}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{detail.vessel_type || '—'}</dd>
                </div>
                <div>
                  <dt>Registration number</dt>
                  <dd>{detail.registration_number || '—'}</dd>
                </div>
                <div>
                  <dt>Home port</dt>
                  <dd>{detail.home_port || '—'}</dd>
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
        <div className="vm-overlay" role="presentation" onClick={() => !deleting && setPendingDelete(null)}>
          <section
            className="vm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="vm-delete-title">Delete vessel?</h2>
            <p>
              Remove <strong>{pendingDelete.name}</strong> from the registry? This cannot be undone.
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
              <button type="button" className="btn btn-primary vm-danger" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete vessel'}
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
