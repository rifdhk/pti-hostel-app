import React from 'react';

export default function FemaleSalwar({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Formal Salwar Kameez Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-female-salwar">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-female-salwar)">
        {/* Soft Sky-Slate Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#EEF5FA" />
        {/* Shoulder-Length Hair */}
        <path
          d="M34 55C34 32 45 21 60 21C75 21 86 32 86 55V86C86 89 80 91 75 91H45C40 91 34 89 34 86V55Z"
          fill="#1E293B"
        />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D99B72" />
        {/* Formal Kameez Tunic */}
        <path d="M18 122C20 93 37 81 60 81C83 81 100 93 102 122H18Z" fill="#0369A1" />
        {/* Kameez Center Placket */}
        <rect x="57" y="88" width="6" height="34" fill="#075985" />
        <circle cx="60" cy="95" r="1.2" fill="#E0F2FE" />
        <circle cx="60" cy="103" r="1.2" fill="#E0F2FE" />
        {/* Formal Dupatta Draped Across Both Shoulders */}
        <path d="M27 122L38 82L51 84L44 122H27Z" fill="#0D9488" />
        <path d="M93 122L82 82L69 84L76 122H93Z" fill="#0D9488" />
        {/* Dupatta Golden-Amber Trim */}
        <path d="M49 84L42 122" stroke="#F59E0B" strokeWidth="2" />
        <path d="M71 84L78 122" stroke="#F59E0B" strokeWidth="2" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="19.5" ry="21.5" fill="#E6B08A" />
        {/* Side-Parted Hair */}
        <path
          d="M40 46C42 31 50 24 60 24C70 24 78 31 80 46C72 37 64 35 55 34C48 35 43 39 40 46Z"
          fill="#1E293B"
        />
        {/* Eyebrows */}
        <path d="M46.5 48C49.5 46.5 53 46.5 55.5 48" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M64.5 48C67 46.5 70.5 46.5 73.5 48" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="53" r="2.2" fill="#1E293B" />
        <circle cx="69" cy="53" r="2.2" fill="#1E293B" />
        {/* Nose & Smile */}
        <path d="M60 53.5V60" stroke="#C98A63" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M54.5 65.5C57.5 68.5 62.5 68.5 65.5 65.5" stroke="#9F5F48" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
