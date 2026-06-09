// Inline SVG glyphs for the cookies modal. Default size is 16×16 — matches
// the project-wide convention; pass width/height as props to override.

import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const DEFAULTS = { width: 16, height: 16 }

export const SearchIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M10.5 10.5l3 3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <path
      d="M8 3.5v9M3.5 8h9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export const LockIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <rect
      x="3.5"
      y="7"
      width="9"
      height="7"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
      stroke="currentColor"
      strokeWidth="1.3"
    />
  </svg>
)

export const ClockIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 4.5V8l2.3 1.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const GlobeIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M2 8h12M8 2c1.8 1.7 1.8 10.3 0 12M8 2C6.2 3.7 6.2 12.3 8 14"
      stroke="currentColor"
      strokeWidth="1.1"
    />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <path
      d="M3 4.5h10M6.5 4.5V3.2a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8V4.5M4.3 4.5l.5 8a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.5-8"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    <path
      d="M3.5 3.5l9 9M12.5 3.5l-9 9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

/** "Sweep clean" — used on Clear-all controls. */
export const BroomIcon = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" {...DEFAULTS} {...p}>
    {/* handle */}
    <path
      d="M13 3L8.5 7.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    {/* bristle holder (rotated square) */}
    <path
      d="M5.5 7L9 3.5L12.5 7L9 10.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    {/* bristles fanning down */}
    <path
      d="M5.5 10.5L3.5 13M7 11.5L6 13.6M8.5 12L8.7 13.8M10 11.8L11.5 13.4"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
)
