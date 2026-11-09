
import React from 'react';

export const EcoMoLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" className="fill-brand-600" />
    <path d="M30 65 L45 50 L55 60 L75 35" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M75 35 L75 50 M75 35 L60 35" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="30" cy="65" r="5" fill="white" />
    <circle cx="45" cy="50" r="5" fill="white" />
    <circle cx="55" cy="60" r="5" fill="white" />
  </svg>
);

export const MindExodusLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" className="fill-violet-600" />
    <path d="M35 75 V25 H65 V75" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M65 25 L82 18 V68 L65 75 Z" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="4" strokeLinejoin="round" />
    <path d="M40 85 L50 65" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" opacity="0.5" />
  </svg>
);

export const EducationLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Deep Academic Navy Background */}
    <rect width="100" height="100" rx="24" fill="#0f172a" />
    
    {/* Left Page (M-Leg 1) - Sky Blue (Bold) */}
    <path 
      d="M20 25 L45 25 L50 60 L50 85 Q35 90 20 80 Z" 
      fill="#38bdf8" 
    />
    
    {/* Right Page (M-Leg 2) - Ocean Blue (Depth & Bold) */}
    <path 
      d="M80 25 L55 25 L50 60 L50 85 Q65 90 80 80 Z" 
      fill="#0ea5e9" 
    />
    
    {/* Page Bottom Curves (Detail) */}
    <path d="M20 80 Q35 90 50 85" stroke="white" strokeWidth="2" strokeOpacity="0.2" fill="none" />
    <path d="M80 80 Q65 90 50 85" stroke="white" strokeWidth="2" strokeOpacity="0.2" fill="none" />

    {/* Center Spine Shadow */}
    <path d="M50 60 L50 85" stroke="#000" strokeWidth="2" strokeOpacity="0.1" />
  </svg>
);
