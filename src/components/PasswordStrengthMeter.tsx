export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const capped = Math.min(score, 4);
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const colors = ['#e57373', '#ffb74d', '#ffd54f', '#81c784', 'var(--clr-green)'];
  return { score: capped, label: labels[capped], color: colors[capped] };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = evaluatePasswordStrength(password);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 4,
              background: i <= score - 1 || (score === 0 && i === 0) ? color : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color }}>{label}</span>
    </div>
  );
}
