import React from 'react';

export default function FemaleNiqab({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Formal Niqab Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-female-niqab">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-female-niqab)">
        {/* Muted Slate-Teal Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#E2ECEB" />
        {/* Formal Abaya / Khimar Outer Shoulders */}
        <path d="M14 122C16 90 35 76 60 76C85 76 104 90 106 122H14Z" fill="#0F172A" />
        {/* Khimar Head & Back Layer */}
        <path
          d="M25 56C25 30 40 16 60 16C80 16 95 30 95 56V98C95 104 80 112 60 112C40 112 25 104 25 98V56Z"
          fill="#1E293B"
        />
        {/* Subtle Teal Khimar Accent Edge */}
        <path
          d="M25 56C25 32 40 18 60 18C80 18 95 32 95 56"
          stroke="#0F766E"
          strokeWidth="3"
        />
        {/* Forehead Band / Inner Cap */}
        <path
          d="M36 47C38 35 48 28 60 28C72 28 82 35 84 47H36Z"
          fill="#115E59"
        />
        {/* Eye Opening Skin Band (Only Eyes Visible) */}
        <rect x="38" y="45" width="44" height="15" rx="6" fill="#E6B08A" />
        {/* Eyebrows */}
        <path d="M44.5 49.5C47.5 47.5 51.5 47.5 54.5 49.5" stroke="#2D1E16" strokeWidth="2" strokeLinecap="round" />
        <path d="M65.5 49.5C68.5 47.5 72.5 47.5 75.5 49.5" stroke="#2D1E16" strokeWidth="2" strokeLinecap="round" />
        {/* Expressive Eyes */}
        <ellipse cx="50" cy="54" rx="3.4" ry="2.5" fill="#FFFFFF" />
        <circle cx="50" cy="54" r="2.1" fill="#1E293B" />
        <circle cx="50.6" cy="53.4" r="0.6" fill="#FFFFFF" />
        <ellipse cx="70" cy="54" rx="3.4" ry="2.5" fill="#FFFFFF" />
        <circle cx="70" cy="54" r="2.1" fill="#1E293B" />
        <circle cx="70.6" cy="53.4" r="0.6" fill="#FFFFFF" />
        {/* Niqab Face Veil Draping Cleanly Below Eyes */}
        <path
          d="M35 58.5C43 57.5 52 58 60 58C68 58 77 57.5 85 58.5L88 94C80 105 70 110 60 110C50 110 40 105 32 94L35 58.5Z"
          fill="#0F172A"
        />
        {/* Subtle Center Veil Seam & Seam Highlight */}
        <path d="M35 58.5C48 61.5 72 61.5 85 58.5" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M37 82C47 89 73 89 83 82" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
