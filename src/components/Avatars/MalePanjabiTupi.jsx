import React from 'react';

export default function MalePanjabiTupi({ className = 'w-full h-full', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Traditional Panjabi with Islamic Tupi and Beard Avatar"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="clip-male-panjabi-tupi">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-male-panjabi-tupi)">
        {/* Calm Emerald-Cream Backdrop */}
        <circle cx="60" cy="60" r="60" fill="#ECF5F1" />
        {/* Neck */}
        <rect x="52" y="71" width="16" height="16" rx="6" fill="#D5956E" />
        {/* Formal Dark Emerald-Teal Panjabi */}
        <path d="M16 122C18 93 36 81 60 81C84 81 102 93 104 122H16Z" fill="#0F766E" />
        {/* Crisp White/Gold Standing Band Collar */}
        <path
          d="M47 80C50 86 55 88 60 88C65 88 70 86 73 80L71 86C67 90 64 91 60 91C56 91 53 90 49 86L47 80Z"
          fill="#F8FAFC"
        />
        {/* Vertical Placket */}
        <rect x="56" y="88" width="8" height="34" fill="#134E4A" />
        <circle cx="60" cy="95" r="1.4" fill="#E2E8F0" />
        <circle cx="60" cy="103" r="1.4" fill="#E2E8F0" />
        <circle cx="60" cy="111" r="1.4" fill="#E2E8F0" />
        {/* Ears */}
        <circle cx="38.5" cy="56" r="4" fill="#D5956E" />
        <circle cx="81.5" cy="56" r="4" fill="#D5956E" />
        {/* Face */}
        <ellipse cx="60" cy="54" rx="20" ry="22" fill="#E2A67E" />
        {/* Short Hair Below Cap Sides */}
        <path d="M39 46C39 42 40 39 41 37V52C39.5 50 39 48 39 46Z" fill="#1C1917" />
        <path d="M81 46C81 42 80 39 79 37V52C80.5 50 81 48 81 46Z" fill="#1C1917" />
        {/* Neat Full Beard & Mustache */}
        <path
          d="M40.5 57C40.5 69 49 78 60 78C71 78 79.5 69 79.5 57C76 62 71 65 66 64.5C64 64 62 63.5 60 63.5C58 63.5 56 64 54 64.5C49 65 44 62 40.5 57Z"
          fill="#1C1917"
        />
        {/* Mouth Opening Through Beard */}
        <ellipse cx="60" cy="67" rx="5.5" ry="2.2" fill="#E2A67E" />
        <path d="M56.5 67C58.5 68.5 61.5 68.5 63.5 67" stroke="#9B5C43" strokeWidth="1.5" strokeLinecap="round" />
        {/* Crisp White Embroidered Islamic Tupi (Prayer Cap) */}
        <path
          d="M40 38C40 24 49 17 60 17C71 17 80 24 80 38V41C74 39.5 67 39 60 39C53 39 46 39.5 40 41V38Z"
          fill="#FFFFFF"
        />
        {/* Subtle Decorative Tupi Rim & Embroidery Lines */}
        <path d="M40 38C50 36.2 70 36.2 80 38" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M42 32C51 30.5 69 30.5 78 32" stroke="#E2E8F0" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M40 41C50 39.5 70 39.5 80 41" stroke="#0F766E" strokeWidth="1.4" opacity="0.55" />
        {/* Eyebrows */}
        <path d="M46.5 47.5C49.5 46 53 46 55.5 47.5" stroke="#1C1917" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M64.5 47.5C67 46 70.5 46 73.5 47.5" stroke="#1C1917" strokeWidth="2.1" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="51" cy="52.5" r="2.2" fill="#1C1917" />
        <circle cx="69" cy="52.5" r="2.2" fill="#1C1917" />
        {/* Nose */}
        <path d="M60 53.5V60" stroke="#C5835B" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
