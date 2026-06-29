import { Apple, Play } from 'lucide-react';
import { STORE_LABELS, STORE_URLS, type StorePlatform } from '../../lib/store';

type StoreBadgeProps = {
  platform: StorePlatform;
  className?: string;
};

const iconByPlatform = {
  ios: Apple,
  android: Play,
} satisfies Record<StorePlatform, typeof Apple>;

export function StoreBadge({ platform, className = '' }: StoreBadgeProps) {
  const Icon = iconByPlatform[platform];
  const label = STORE_LABELS[platform];

  return (
    <a
      aria-label={label.aria}
      className={`inline-flex min-h-14 items-center gap-3 rounded-[14px] bg-ink px-4 py-2.5 text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
      href={STORE_URLS[platform]}
      rel="noreferrer"
      target="_blank"
    >
      <Icon aria-hidden="true" size={24} strokeWidth={2.2} />
      <span className="flex flex-col text-left leading-none">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/75">{label.eyebrow}</span>
        <span className="mt-1 text-[19px] font-semibold tracking-normal">{label.name}</span>
      </span>
    </a>
  );
}
