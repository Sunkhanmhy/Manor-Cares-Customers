import type { ReactNode } from 'react';

export function GlassCard({
  children,
  className = '',
  style,
  strong = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  strong?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${strong ? 'glass-strong' : 'glass'} ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}

