import { Clock3, Home, Leaf, ListChecks, PenLine, RefreshCw, Sprout } from 'lucide-react';

function PhoneShell({ children, label, className = '' }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div className={`phone-frame relative mx-auto w-[272px] rounded-[34px] bg-[#101211] p-2 shadow-phone ${className}`}>
      {label ? (
        <p className="absolute -top-10 left-1/2 w-max -translate-x-1/2 font-display text-xl font-semibold text-ink">
          {label}
        </p>
      ) : null}
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-b-[15px] rounded-t-[10px] bg-black" />
      <div className="overflow-hidden rounded-[28px] bg-[#f8f7f2]">
        <div className="flex h-[556px] flex-col">{children}</div>
      </div>
    </div>
  );
}

export function HeroPhoneScreenshot() {
  return (
    <div className="phone-frame relative mx-auto w-[272px] rounded-[34px] bg-[#101211] p-2 shadow-phone">
      <div className="overflow-hidden rounded-[28px] bg-[#f8f7f2]">
        <img
          alt="PivotLogのホーム画面"
          className="block w-full"
          src="/images/app/hero-home-screen.png"
        />
      </div>
    </div>
  );
}

export function AppScreenshotPhone({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`phone-frame relative mx-auto w-[min(210px,42vw)] rounded-[30px] bg-[#101211] p-1.5 shadow-phone sm:w-[230px] sm:p-2 lg:w-[246px] ${className}`}>
      <div className="overflow-hidden rounded-[24px] bg-[#f8f7f2] sm:rounded-[26px]">
        <img
          alt={alt}
          className="block w-full"
          src={src}
          loading="lazy"
        />
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex h-9 items-center justify-between px-5 pt-2 text-[10px] font-semibold text-ink">
      <span>21:40</span>
      <span className="tracking-[0.16em]">⌁ ▰</span>
    </div>
  );
}

function ProgressGrid() {
  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 84 }).map((_, index) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={`progress-cell h-2.5 rounded-[2px] ${index < 30 ? 'progress-cell-completed bg-[#78946f]' : index < 56 ? 'bg-[#d8ded2]' : 'bg-[#ebeee8]'}`}
          style={index < 30 ? { '--progress-delay': `${index * 18}ms` } as React.CSSProperties : undefined}
        />
      ))}
    </div>
  );
}

export function HomePhone() {
  return (
    <PhoneShell className="md:rotate-0">
      <StatusBar />
      <div className="flex items-center justify-center border-b border-line/70 px-5 pb-3 text-[13px] font-medium">
        <span>ホーム</span>
        <RefreshCw className="absolute right-5 h-4 w-4 text-muted" />
      </div>
      <div className="flex-1 space-y-2.5 p-4">
        <p className="text-center text-xs text-muted">6月25日（木）</p>
        <section className="rounded-card bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-center gap-2 text-[10px] text-muted">
            <Clock3 className="h-3 w-3" />
            <span>残りの時間</span>
          </div>
          <p className="text-center text-3xl font-light tracking-normal text-ink">
            19,145<span className="text-lg text-muted">.09656</span>
          </p>
          <p className="mt-1 text-center text-[11px] text-muted">日</p>
        </section>
        <section className="rounded-card bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] text-muted">
            <Sprout className="h-3 w-3" />
            <span>人生の進捗</span>
          </div>
          <ProgressGrid />
          <div className="mt-3 flex justify-center gap-4 text-[10px] text-muted">
            <span><b className="text-[#78946f]">■</b> 経過 29年</span>
            <span><b className="text-[#d8ded2]">■</b> 残り 53年</span>
          </div>
        </section>
        <section className="rounded-card bg-white p-4 text-center shadow-soft">
          <div className="mb-2 flex items-center justify-center gap-2 text-[10px] text-muted">
            <Leaf className="h-3 w-3" />
            <span>今日の視点</span>
          </div>
          <div className="mx-auto mb-2 h-8 w-10 rounded-full bg-accent-gold/30" />
          <p className="text-xs font-semibold">許したい人、許されたい人はいますか</p>
          <p className="mt-1 text-[10px] leading-4 text-muted">その重さを降ろせる日は、自分で選べる</p>
          <p className="mt-2 text-[10px] font-semibold text-accent-coral">4日間連続</p>
        </section>
        <button className="flex h-10 w-full items-center justify-center gap-2 rounded-card bg-[#78946f] text-sm font-semibold text-white">
          <PenLine className="h-4 w-4" />
          今日を記録する
        </button>
      </div>
      <div className="grid h-12 grid-cols-2 border-t border-line/70 bg-white text-[10px] text-muted">
        <div className="flex flex-col items-center justify-center text-[#78946f]"><Home className="h-4 w-4" />ホーム</div>
        <div className="flex flex-col items-center justify-center"><ListChecks className="h-4 w-4" />記録一覧</div>
      </div>
    </PhoneShell>
  );
}
