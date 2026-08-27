import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.8 7 7.3 5.3a1.5 1.5 0 0 0 1.8 0L20.2 7" />
    </Icon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.4v2" />
    </Icon>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4s6.1 1.8 7.2 5.4" />
    </Icon>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6" />
      <path d="M10.6 5.6h2.8" />
      <path d="M10.8 18.2h2.4" />
    </Icon>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.4 12S6 5.9 12 5.9 21.6 12 21.6 12 18 18.1 12 18.1 2.4 12 2.4 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </Icon>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4.4 20 20.4" />
      <path d="M9.6 5.4A9.6 9.6 0 0 1 12 5.1c6 0 9.6 6.1 9.6 6.1a19 19 0 0 1-2.7 3.5" />
      <path d="M6.7 7.3A18.6 18.6 0 0 0 2.4 11.2s3.6 6.1 9.6 6.1a9.9 9.9 0 0 0 3.4-.6" />
      <path d="M10.2 9.6a2.9 2.9 0 0 0 3.9 4.1" />
    </Icon>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.2l7 2.6v5.5c0 4.3-2.8 7.6-7 9.5-4.2-1.9-7-5.2-7-9.5V5.8Z" />
      <path d="m9.1 12 2.1 2.1 3.8-4" />
    </Icon>
  )
}

export function WavesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.6 8.4c1.7-1.7 3.3-1.7 4.8 0s3.2 1.7 4.8 0 3.2-1.7 4.8 0 3.1 1.7 4.4.3" />
      <path d="M2.6 13.2c1.7-1.7 3.3-1.7 4.8 0s3.2 1.7 4.8 0 3.2-1.7 4.8 0 3.1 1.7 4.4.3" />
      <path d="M2.6 18c1.7-1.7 3.3-1.7 4.8 0s3.2 1.7 4.8 0 3.2-1.7 4.8 0 3.1 1.7 4.4.3" />
    </Icon>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.4v4.2M12 16.4v4.2M4.9 12h4.2M14.9 12h4.2" />
      <path d="m7 7 2.6 2.6M14.4 14.4 17 17M17 7l-2.6 2.6M9.6 14.4 7 17" />
      <circle cx="12" cy="12" r="2.2" />
    </Icon>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9.2" cy="9" r="3.1" />
      <path d="M3.4 19.4c.9-3 3-4.5 5.8-4.5s4.9 1.5 5.8 4.5" />
      <path d="M16.2 6.5a3 3 0 0 1 0 5.6" />
      <path d="M18 15.3c1.6.7 2.5 2 2.9 3.8" />
    </Icon>
  )
}

export function BoatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.4 13.6h15.2l-2 5a1.6 1.6 0 0 1-1.5 1H7.9a1.6 1.6 0 0 1-1.5-1Z" />
      <path d="M12 13.6V3.8l6 6.2" />
      <path d="M12 8.2 6.6 10.4" />
    </Icon>
  )
}

export function FlaskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.4 3.4h5.2" />
      <path d="M10.2 3.4v5.3L5.6 17a2.4 2.4 0 0 0 2.1 3.6h8.6a2.4 2.4 0 0 0 2.1-3.6l-4.6-8.3V3.4" />
      <path d="M7.6 14.6h8.8" />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.2 21 19.6H3Z" />
      <path d="M12 9.6v4.2" />
      <path d="M12 16.7h.01" />
    </Icon>
  )
}

export function AnchorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5.4" r="2.2" />
      <path d="M12 7.6v12.8" />
      <path d="M8.4 11h7.2" />
      <path d="M4.4 14.2c0 3.6 3.4 6.2 7.6 6.2s7.6-2.6 7.6-6.2" />
    </Icon>
  )
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 9.8h16.8M3.6 14.2h16.8" />
      <path d="M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6S14.4 18.2 12 20.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4Z" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m14.4 6.4-5.6 5.6 5.6 5.6" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6.4 9.6 5.6 5.6 5.6-5.6" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.6 4.4 4.4L19 7.4" />
    </Icon>
  )
}

export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11.4 20.4 4l-7.4 16.4-2.1-6.6Z" />
      <path d="m10.9 13.8 9.5-9.8" />
    </Icon>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.2s6.4-5.2 6.4-10.2A6.4 6.4 0 0 0 5.6 11c0 5 6.4 10.2 6.4 10.2Z" />
      <circle cx="12" cy="10.8" r="2.1" />
    </Icon>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.2 16.6h11.6c-.6-1-1-2.1-1-3.4V11a4.8 4.8 0 1 0-9.6 0v2.2c0 1.3-.4 2.4-1 3.4Z" />
      <path d="M10 16.6v.8a2 2 0 0 0 4 0v-.8" />
    </Icon>
  )
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="3.4" width="6" height="10" rx="3" />
      <path d="M6.4 11.2a5.6 5.6 0 0 0 11.2 0" />
      <path d="M12 16.8v3.8" />
    </Icon>
  )
}

export function WindIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8.4h9.2a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M4 12.4h13.2a2.4 2.4 0 1 1-2.4 2.4" />
      <path d="M4 16.4h6.6" />
    </Icon>
  )
}

export function CompassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m10.2 13.8 1.2-5.2 5.2 1.2-1.2 5.2Z" />
    </Icon>
  )
}

export function CloudRainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.4 16.2A4.4 4.4 0 1 1 8.8 7.8 5.2 5.2 0 0 1 18.6 10a3.4 3.4 0 0 1 .2 6.2" />
      <path d="M8.6 18.8v1.6M12 18.2v2.2M15.4 18.8v1.6" />
    </Icon>
  )
}

export function FishIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12.2c3.4-4.6 7.8-6.4 12.6-4.6 1.8.7 3.4 1.3 4.8 1.3-1.2 1.2-1.8 2.4-1.8 3.3s.6 2.1 1.8 3.3c-1.4 0-3-.6-4.8-1.3C11.8 18.4 7.4 16.6 4 12.2Z" />
      <path d="M4 12.2 7.2 9.2M4 12.2l3.2 3" />
      <circle cx="14.6" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.4 4.6H6.8a2 2 0 0 0-2 2v10.8a2 2 0 0 0 2 2h7.6" />
      <path d="M18.8 12H10" />
      <path d="m15.8 8.8 3.2 3.2-3.2 3.2" />
    </Icon>
  )
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.06-1.35-.18-2H12v3.8h5.4a4.63 4.63 0 0 1-2 3.04v2.53h3.24c1.9-1.75 2.96-4.33 2.96-7.37Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6 6 0 0 1 0-3.84v-2.6H3.06a10 10 0 0 0 0 9.04l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.02c1.47 0 2.79.5 3.83 1.5l2.86-2.86C16.95 3.02 14.7 2 12 2 8.06 2 4.66 4.26 3.06 7.48l3.35 2.6C7.2 7.78 9.4 6.02 12 6.02Z"
      />
    </svg>
  )
}

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="40"
      height="40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id="orca-mark" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a76d8" />
          <stop offset="0.55" stopColor="#3ecdf5" />
          <stop offset="1" stopColor="#a9f1ff" />
        </linearGradient>
      </defs>
      <g stroke="url(#orca-mark)" strokeLinecap="round">
        <path d="M34.6 11.4a15 15 0 1 0 4.2 17.2" strokeWidth="3.4" />
        <path d="M31 17.2a9.2 9.2 0 1 0 2.6 10.6" strokeWidth="2.8" opacity="0.8" />
        <path d="M27.4 22.4a4 4 0 1 0 1.4 4.8" strokeWidth="2.2" opacity="0.6" />
      </g>
      <circle cx="24" cy="24" r="2" fill="#bff2ff" />
    </svg>
  )
}
