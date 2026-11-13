import React from 'react';

export default function MaleShirt({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Formal Button-Down Shirt Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-male-shirt">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-male-shirt)">
        {/* Soft Mint-Slate Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#ECF6F5" />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D5956E" />
        {/* Formal Sky-Blue Button-Down Dress Shirt */}
        <path d="M16 122C18 93 36 81 60 81C84 81 102 93 104 122H16Z" fill="#0284C7" />
        {/* Crisp Undershirt V-Hint */}
        <path d="M53 82L60 92L67 82H53Z" fill="#F8FAFC" />
        {/* Formal Shirt Collar Flaps */}
        <path d="M47 81L59 92L51 97L42 86L47 81Z" fill="#BAE6FD" />
        <path d="M73 81L61 92L69 97L78 86L73 81Z" fill="#BAE6FD" />
        {/* Center Placket & Buttons */}
        <rect x="58" y="92" width="4" height="30" fill="#0369A1" />
        <circle cx="60" cy="98" r="1.2" fill="#E0F2FE" />
        <circle cx="60" cy="107" r="1.2" fill="#E0F2FE" />
        <circle cx="60" cy="116" r="1.2" fill="#E0F2FE" />
        {/* Chest Pocket Detail */}
        <path d="M73 100H85V112C85 114 82 115 79 115C76 115 73 114 73 112V100Z" fill="#0369A1" opacity="0.55" />
        {/* Ears */}
        <circle cx="38.5" cy="56" r="4" fill="#D5956E" />
        <circle cx="81.5" cy="56" r="4" fill="#D5956E" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="20" ry="22" fill="#E2A67E" />
        {/* Clean Cropped Hair */}
        <path
          d="M39 50C38 30 48 21 60 21C72 21 82 30 81 50C77 38 69 34 60 34C51 34 43 38 39 50Z"
          fill="#1E293B"
        />
        {/* Eyebrows */}
        <path d="M46.5 47.5C49.5 46 53 46 55.5 47.5" stroke="#1E293B" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M64.5 47.5C67 46 70.5 46 73.5 47.5" stroke="#1E293B" strokeWidth="2.1" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="53" r="2.2" fill="#1E293B" />
        <circle cx="69" cy="53" r="2.2" fill="#1E293B" />
        {/* Nose & Friendly Smile */}
        <path d="M60 53.5V60" stroke="#C5835B" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M54.5 65.5C57.5 68.5 62.5 68.5 65.5 65.5" stroke="#9B5C43" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
