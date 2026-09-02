import { useState } from 'react';
import Icon3D from './Icon3D';

export default function Icon({ name, size = 40, className = '' }: { name: string; size?: number; className?: string }) {
  const [errored, setErrored] = useState(false);
  const src = `/icons/${name}.svg`;

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
      style={{ width: size, height: size, flex: '0 0 auto', filter: 'brightness(0) invert(1)' }}
    />
  );
}
