import { useState } from 'react';
import Icon3D from './Icon3D';

const ICON_COLOR_MAP: Record<string, string> = {
  dashboard: '#22d3ee',
  user: '#f59e0b',
  location: '#fb7185',
  clean: '#34d399',
  calendar: '#a78bfa',
  payments: '#2dd4bf',
  invoice: '#60a5fa',
  support: '#f97316',
  notifications: '#facc15',
  security: '#10b981',
  settings: '#38bdf8',
  logout: '#f87171',
  people: '#a78bfa',
  check: '#22c55e',
  clock: '#38bdf8',
  bell: '#facc15',
  lock: '#10b981',
  home: '#60a5fa',
  building: '#34d399',
  office: '#2dd4bf',
  star: '#f4c95d',
};

const AUTO_VECTOR_ICON_NAMES = new Set([
  'dashboard',
  'user',
  'location',
  'clean',
  'calendar',
  'payments',
  'invoice',
  'support',
  'notifications',
  'settings',
  'security',
  'logout',
  'people',
  'money',
  'check',
  'clock',
  'default',
  'menu',
  'bell',
  'lock',
  'home',
  'building',
  'office',
  'star',
]);

export default function Icon({
  name,
  size = 40,
  className = '',
  color,
  vector = false,
}: {
  name: string;
  size?: number;
  className?: string;
  color?: string;
  vector?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const resolvedColor = color ?? ICON_COLOR_MAP[name] ?? 'var(--clr-blue)';
  const src = `/icons/${name}.svg`;
  const shouldUseVector = vector || color || AUTO_VECTOR_ICON_NAMES.has(name);

  if (shouldUseVector) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          color: resolvedColor,
          alignItems: 'center',
          justifyContent: 'center',
          ['--icon-filter' as string]: 'none',
          ['--icon-color' as string]: resolvedColor,
        }}
      >
        <Icon3D name={name as any} size={size} />
      </span>
    );
  }

  if (errored) {
    return <Icon3D name={name as any} size={size} />;
  }

  return (
    // use img so files in /public/icons are served as static assets; fall back to Icon3D on error
    <img
      src={src}
      onError={() => setErrored(true)}
      width={size}
      height={size}
      className={`icon ${className}`}
      alt={name}
      style={{ width: size, height: size, flex: '0 0 auto', filter: 'var(--icon-filter, brightness(0) invert(1))' }}
    />
  );
}
