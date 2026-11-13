import React from 'react';

export default function MalePolo({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Smart Casual Polo Shirt Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-male-polo">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-male-polo)">
        {/* Crisp Indigo-Slate Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#EEF2FF" />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D5956E" />
        {/* Smart-Casual Polo Shirt Body */}
        <path d="M16 122C18 93 36 81 60 81C84 81 102 93 104 122H16Z" fill="#0D9488" />
        {/* Inner Neck Trim */}
        <path d="M51 81L60 91L69 81H51Z" fill="#115E59" />
        {/* Contrasting Knit Polo Collar */}
        <path d="M47 80L59 91L51 96L42 86L47 80Z" fill="#0F766E" />
        <path d="M73 80L61 91L69 96L78 86L73 80Z" fill="#0F766E" />
        {/* Two-Button Polo Placket */}
        <rect x="57.5" y="90" width="5" height="18" rx="1.5" fill="#115E59" />
        <circle cx="60" cy="95" r="1.2" fill="#F8FAFC" />
        <circle cx="60" cy="102" r="1.2" fill="#F8FAFC" />
        {/* Clean Chest Stripe Detail */}
        <rect x="26" y="109" width="68" height="3.5" fill="#14B8A6" opacity="0.55" />
        {/* Ears */}
        <circle cx="38.5" cy="56" r="4" fill="#D5956E" />
        <circle cx="81.5" cy="56" r="4" fill="#D5956E" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="20" ry="22" fill="#E2A67E" />
        {/* Modern Textured Neat Hair */}
        <path
          d="M38 50C38 30 47 19 60 19C73 19 82 30 82 50C78 39 70 35 61 33C51 33 42 39 38 50Z"
          fill="#1E293B"
        />
        {/* Subtle Hair Volume Sweep */}
        <path d="M47 26C54 22 66 22 73 27" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        {/* Eyebrows */}
        <path d="M46.5 47.5C49.5 46 53 46 55.5 47.5" stroke="#1E293B" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M64.5 47.5C67 46 70.5 46 73.5 47.5" stroke="#1E293B" strokeWidth="2.1" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="53" r="2.2" fill="#1E293B" />
        <circle cx="69" cy="53" r="2.2" fill="#1E293B" />
        {/* Nose & Warm Smile */}
        <path d="M60 53.5V60" stroke="#C5835B" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M54.5 66C57.5 68.5 62.5 68.5 65.5 66" stroke="#9B5C43" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
