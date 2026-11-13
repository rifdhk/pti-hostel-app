import React from 'react';

export default function FemaleSaree({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Traditional Formal Saree Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-female-saree">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-female-saree)">
        {/* Warm Soft Cream Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#FDF2F4" />
        {/* Hair Bun Behind Head */}
        <circle cx="60" cy="30" r="14" fill="#1C1917" />
        {/* Hair Canopy */}
        <path
          d="M35 56C35 34 45 22 60 22C75 22 85 34 85 56V66H35V56Z"
          fill="#1C1917"
        />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D99B72" />
        {/* Formal Saree Blouse */}
        <path d="M18 122C20 94 37 81 60 81C83 81 100 94 102 122H18Z" fill="#7F1D1D" />
        {/* Blouse Sweetheart / Round Neckline */}
        <path d="M47 82C51 90 69 90 73 82H47Z" fill="#E6B08A" />
        {/* Draped Saree Anchal Across Left Shoulder */}
        <path d="M22 122L36 81L56 83L96 122H22Z" fill="#9F1239" />
        {/* Traditional Gold-Embroidered Saree Border */}
        <path d="M35 81L54 83L92 122H82L46 84Z" fill="#F59E0B" />
        <path d="M42 82L85 122" stroke="#FDE68A" strokeWidth="1.2" />
        {/* Ears & Small Pearl Studs */}
        <circle cx="38.5" cy="56" r="4" fill="#D99B72" />
        <circle cx="81.5" cy="56" r="4" fill="#D99B72" />
        <circle cx="38.5" cy="59.5" r="1.6" fill="#F8FAFC" />
        <circle cx="81.5" cy="59.5" r="1.6" fill="#F8FAFC" />
        {/* Face */}
        <ellipse cx="60" cy="55" rx="20" ry="22" fill="#E6B08A" />
        {/* Middle-Parted Hair */}
        <path
          d="M40 46C42 32 51 25 60 25C69 25 78 32 80 46C74 37 66 34 60 32C54 34 46 37 40 46Z"
          fill="#1C1917"
        />
        {/* Traditional Small Maroon Bindi */}
        <circle cx="60" cy="44" r="1.8" fill="#9F1239" />
        {/* Eyebrows */}
        <path d="M46.5 48.5C49.5 46.8 53 46.8 55.5 48.3" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M64.5 48.3C67 46.8 70.5 46.8 73.5 48.5" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="53.5" r="2.2" fill="#1C1917" />
        <circle cx="69" cy="53.5" r="2.2" fill="#1C1917" />
        {/* Nose & Warm Smile */}
        <path d="M60 54V60.5" stroke="#C98A63" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M54 66C57.5 68.8 62.5 68.8 66 66" stroke="#9F5F48" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
