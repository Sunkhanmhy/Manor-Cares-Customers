export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-label="Loading"
      role="status"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2.5px solid rgba(255,255,255,0.25)',
        borderTopColor: 'var(--clr-white)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        minHeight: '60vh',
        color: 'var(--text-muted)',
      }}
    >
      <Spinner size={34} />
      <span>{label}</span>
    </div>
  );
}
