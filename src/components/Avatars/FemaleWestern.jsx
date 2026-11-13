import React from 'react';

export default function FemaleWestern({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Formal Corporate Blazer Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-female-western">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-female-western)">
        {/* Crisp Corporate Slate Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#F1F5F9" />
        {/* Neat Executive Chignon / Low Bun */}
        <circle cx="60" cy="27" r="12" fill="#1E293B" />
        {/* Back Hair Framing */}
        <path d="M36 54C36 33 46 23 60 23C74 23 84 33 84 54V68H36V54Z" fill="#1E293B" />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D99B72" />
        {/* Crisp White Collared Blouse */}
        <path d="M22 122C24 94 38 82 60 82C82 82 96 94 98 122H22Z" fill="#FFFFFF" />
        {/* Tailored Charcoal-Navy Blazer */}
        <path d="M16 122C18 93 35 81 48 82L57 122H16Z" fill="#1E293B" />
        <path d="M104 122C102 93 85 81 72 82L63 122H104Z" fill="#1E293B" />
        {/* Blazer Structured Lapels */}
        <path d="M46 82L57 110L48 106L41 92L46 82Z" fill="#334155" />
        <path d="M74 82L63 110L72 106L79 92L74 82Z" fill="#334155" />
        {/* Subtle Teal Institutional Lapel Pin */}
        <circle cx="72" cy="98" r="2.2" fill="#0D9488" />
        {/* Blouse Center Line */}
        <line x1="60" y1="88" x2="60" y2="122" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="19" ry="21.5" fill="#E6B08A" />
        {/* Sleek Parted Hair */}
        <path
          d="M41 47C42 32 50 25 60 25C70 25 78 32 79 47C73 38 66 35 58 34C49 35 44 39 41 47Z"
          fill="#1E293B"
        />
        {/* Eyebrows */}
        <path d="M47 48.5C49.5 47 53 47 55.5 48.5" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M64.5 48.5C67 47 70.5 47 73 48.5" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51.5" cy="53.5" r="2.2" fill="#1E293B" />
        <circle cx="68.5" cy="53.5" r="2.2" fill="#1E293B" />
        {/* Nose & Confident Smile */}
        <path d="M60 54V60" stroke="#C98A63" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M54.5 66C57.5 68.5 62.5 68.5 65.5 66" stroke="#9F5F48" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
