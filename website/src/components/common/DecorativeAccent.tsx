import type { HTMLAttributes } from 'react';

type DecorativeAccentProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'brand' | 'coral' | 'mint' | 'gold';
};

const toneClassName = {
  brand: 'border-brand-100 bg-brand-50',
  coral: 'border-accent-coral/25 bg-accent-coral/10',
  mint: 'border-accent-mint/35 bg-accent-mint/15',
  gold: 'border-accent-gold/35 bg-accent-gold/15',
} satisfies Record<NonNullable<DecorativeAccentProps['tone']>, string>;

export function DecorativeAccent({ className = '', tone = 'brand', ...props }: DecorativeAccentProps) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-card border ${toneClassName[tone]} ${className}`}
      {...props}
    />
  );
}
