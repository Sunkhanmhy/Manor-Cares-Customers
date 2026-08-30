export function Skeleton({ height = 16, width = '100%', radius = 8 }: { height?: number; width?: string | number; radius?: number }) {
  return (
    <span
      style={{
        display: 'block',
        height,
        width,
        borderRadius: radius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.16) 37%, rgba(255,255,255,0.07) 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeleton-shimmer 1.4s ease infinite',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={22} width="70%" />
      <Skeleton height={12} width="55%" />
    </div>
  );
}

const styleTag = document.createElement('style');
styleTag.innerHTML = `@keyframes skeleton-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`;
if (!document.head.querySelector('style[data-skeleton]')) {
  styleTag.setAttribute('data-skeleton', 'true');
  document.head.appendChild(styleTag);
}
