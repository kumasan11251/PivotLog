type LogoProps = {
  className?: string;
  markClassName?: string;
  showText?: boolean;
};

export function Logo({ className = '', markClassName = '', showText = true }: LogoProps) {
  return (
    <a className={`inline-flex items-center gap-3 text-ink ${className}`} href="/" aria-label="PivotLog トップ">
      <img
        alt="PivotLogアプリアイコン"
        className={`h-10 w-10 rounded-[12px] shadow-soft ${markClassName}`}
        height="40"
        src="/images/app/icon.png"
        width="40"
      />
      {showText ? <span className="font-display text-xl font-semibold tracking-normal">PivotLog</span> : null}
    </a>
  );
}
