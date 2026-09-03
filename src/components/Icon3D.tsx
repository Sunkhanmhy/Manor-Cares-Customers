import React from 'react';

export type IconName =
  | 'dashboard'
  | 'user'
  | 'location'
  | 'clean'
  | 'calendar'
  | 'payments'
  | 'invoice'
  | 'support'
  | 'notifications'
  | 'settings'
  | 'security'
  | 'logout'
  | 'people'
  | 'money'
  | 'check'
  | 'clock'
  | 'default'
  | 'menu'
  | 'bell'
  | 'lock'
  | 'home'
  | 'building'
  | 'office'
  | 'star';

function BaseWrapper({ children, size = 24 }: { children: React.ReactNode; size?: number }) {
  return (
    <span className="icon" aria-hidden style={{ display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </span>
  );
}

export function Icon3D({ name, size = 24 }: { name: IconName | string; size?: number }) {
  const n = (name || 'default') as IconName;
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' } as any;

  // Flat icons: use `currentColor` so each icon can inherit themed or explicit colors.
  switch (n) {
    case 'home':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <path d="M3 11.5L12 4l9 7.5v8.5a1 1 0 0 1-1 1h-5.5v-5.5h-5V21H4a1 1 0 0 1-1-1z" fill="currentColor" opacity="0.12" />
            <path d="M8.5 21v-5.5h7V21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
          </svg>
        </BaseWrapper>
      );
    case 'building':
    case 'office':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="4" y="3" width="16" height="18" rx="1.8" fill="currentColor" opacity="0.12" />
            <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M11 21v-4h2v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
          </svg>
        </BaseWrapper>
      );
    case 'star':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8-4.2-4.1 5.8-.8z" fill="currentColor" opacity="0.14" />
          </svg>
        </BaseWrapper>
      );
    case 'user':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <circle cx="12" cy="8" r="3.2" fill="currentColor" opacity="0.12" />
            <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" fill="currentColor" opacity="0.08" />
          </svg>
        </BaseWrapper>
      );
    case 'location':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="currentColor" opacity="0.12" />
            <circle cx="12" cy="9" r="2.2" fill="currentColor" opacity="0.16" />
          </svg>
        </BaseWrapper>
      );
    case 'clean':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="3" y="3" width="18" height="6" rx="1.5" fill="currentColor" opacity="0.08" />
            <path d="M6 14c2-2 6-2 8 0s6 2 8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />
          </svg>
        </BaseWrapper>
      );
    case 'calendar':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="3" y="4" width="18" height="17" rx="2" fill="currentColor" opacity="0.08" />
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </svg>
        </BaseWrapper>
      );
    case 'payments':
    case 'money':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor" opacity="0.08" />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.16" />
          </svg>
        </BaseWrapper>
      );
    case 'invoice':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="4" y="3" width="12" height="18" rx="1.5" fill="currentColor" opacity="0.08" />
            <path d="M8 7h6M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </svg>
        </BaseWrapper>
      );
    case 'support':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.06" />
            <path d="M8 11c0-2 2-3 4-3s4 1 4 3v1c0 2-2 3-4 3s-4-1-4-3v-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </svg>
        </BaseWrapper>
      );
    case 'notifications':
    case 'bell':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <path d="M15 17H9a3 3 0 0 0 6 0z" fill="currentColor" opacity="0.06" />
            <path d="M12 3v1m0 0a4 4 0 0 1 4 4v3l1 2H7l1-2V8a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseWrapper>
      );
    case 'settings':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.06" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.27 18.1l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.29-.45 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 5.8 2.27l.06.06A1.65 1.65 0 0 0 7.68 2a1.65 1.65 0 0 0 1-1.51V1a2 2 0 1 1 4 0v.09c.3.02.6.12.86.29" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseWrapper>
      );
    case 'security':
    case 'lock':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" opacity="0.06" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseWrapper>
      );
    case 'logout':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseWrapper>
      );
    case 'check':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseWrapper>
      );
    case 'clock':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" opacity="0.08" />
            <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BaseWrapper>
      );
    case 'menu':
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor" opacity="0.12" />
            <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" opacity="0.12" />
            <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" opacity="0.12" />
          </svg>
        </BaseWrapper>
      );
    default:
      return (
        <BaseWrapper size={size}>
          <svg {...commonProps}>
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.06" />
          </svg>
        </BaseWrapper>
      );
  }
}

export default Icon3D;
