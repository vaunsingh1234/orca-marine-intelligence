import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  AlertIcon,
  AnchorIcon,
  BoatIcon,
  CheckIcon,
  ChevronDownIcon,
  FlaskIcon,
  ShieldIcon,
  UsersIcon,
} from './Icons'
import { PROFESSIONS, type ProfessionId } from '../auth/professions'
import './RoleSelect.css'

const ROLE_ICONS: Record<ProfessionId, ReactNode> = {
  fisherman: <BoatIcon />,
  researcher: <FlaskIcon />,
  'coastal-authority': <ShieldIcon />,
  'disaster-agency': <AlertIcon />,
  'maritime-operator': <AnchorIcon />,
}

type RoleSelectProps = {
  id: string
  label: string
  value: ProfessionId | ''
  onChange: (value: ProfessionId) => void
}

export default function RoleSelect({ id, label, value, onChange }: RoleSelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const selected = PROFESSIONS.find((item) => item.id === value)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function selectedIndex() {
    return Math.max(
      PROFESSIONS.findIndex((item) => item.id === value),
      0,
    )
  }

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setActive(selectedIndex())
    setOpen(true)
  }

  function pick(index: number) {
    const role = PROFESSIONS[index]
    if (!role) return
    onChange(role.id)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      if (!open) return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
      return
    }

    if (!open) {
      const opens = ['ArrowDown', 'ArrowUp', 'Enter', ' ']
      if (opens.includes(event.key)) {
        event.preventDefault()
        toggle()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % PROFESSIONS.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current - 1 + PROFESSIONS.length) % PROFESSIONS.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(PROFESSIONS.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      pick(active)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="auth-field" ref={wrapRef}>
      <span className="auth-label" id={`${id}-label`}>
        {label}
      </span>

      <div className="role-select">
        <button
          ref={buttonRef}
          id={id}
          type="button"
          className={open ? 'role-trigger is-open' : 'role-trigger'}
          onClick={toggle}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-controls={`${id}-list`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={`${id}-label`}
          aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        >
          <span className="role-trigger-icon">
            {selected ? ROLE_ICONS[selected.id] : <UsersIcon />}
          </span>
          <span className={selected ? 'role-trigger-value' : 'role-trigger-value is-empty'}>
            {selected ? selected.label : 'Select your role'}
          </span>
          <ChevronDownIcon className="role-trigger-arrow" width={18} height={18} />
        </button>

        {open ? (
          <ul
            className="role-list scroll-soft"
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            tabIndex={-1}
          >
            {PROFESSIONS.map((role, index) => (
              <li key={role.id} role="none">
                <button
                  type="button"
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={role.id === value}
                  className={
                    index === active
                      ? 'role-option is-active'
                      : role.id === value
                        ? 'role-option is-selected'
                        : 'role-option'
                  }
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(index)}
                  onKeyDown={onKeyDown}
                >
                  <span className="role-option-icon">{ROLE_ICONS[role.id]}</span>
                  <span className="role-option-label">{role.label}</span>
                  {role.id === value ? (
                    <CheckIcon className="role-option-check" width={16} height={16} />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
