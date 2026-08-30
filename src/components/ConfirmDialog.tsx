import { GlassCard } from './GlassCard';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 10, 20, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onCancel}
    >
      <GlassCard strong style={{ padding: 24, maxWidth: 400, width: '100%' }}>
        <div onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginBottom: 10 }}>{title}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20 }}>{message}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
              {busy ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
