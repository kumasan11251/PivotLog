import { useEffect, useState } from 'react';
import { CircleDot, Grid3x3, Hourglass, Minus } from 'lucide-react';
import { StoreBadge } from '../../components/common';
import { PageShell } from '../PageShell';

// ── 計算ロジック（JSX から分離。境界条件を手作業で確認しやすくする）──

const MIN_TARGET_AGE = 1;
const MAX_TARGET_AGE = 120;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// CLAUDE.md 準拠。new Date(dateString) は使わず、コンポーネント分解でパースする。
function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  // 2月30日などの繰り上がりを弾く（入力どおりの日付になっているか検証）。
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

// 記念日（誕生日の n 年後）。2月29日生まれで目標年に2月29日が存在しない場合は2月28日 00:00 に着地。
function makeAnniversaryDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getMonth() !== month - 1) {
    // 2/29 → 3/1 に繰り上がったケース。2/28 に丸める。
    return new Date(year, month - 1, day - 1, 0, 0, 0, 0);
  }
  return date;
}

export type CountdownBreakdown = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type CountdownStatus = 'ok' | 'incomplete' | 'invalid-age' | 'future-birthday' | 'reached';

export type CountdownResult = {
  status: CountdownStatus;
  progress: number; // 0-100
  breakdown: CountdownBreakdown | null;
  targetDate: Date | null; // ok のときだけ非null
  totalMs: number;
  elapsedMs: number;
  remainingMs: number;
  currentAge: number; // 経過割合 × 目標寿命（グリッド表示に使う）
};

// from <= to のカレンダー差分（年・月・日・時・分・秒）。月は30日固定にせず実日数で借りる。
function calendarBreakdown(from: Date, to: Date): CountdownBreakdown {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  let hours = to.getHours() - from.getHours();
  let minutes = to.getMinutes() - from.getMinutes();
  let seconds = to.getSeconds() - from.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    // `to` の前月の実日数を借りる。
    const daysInPrevMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += daysInPrevMonth;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  return { years, months, days, hours, minutes, seconds };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateLifeCountdown(args: {
  birthdayValue: string;
  targetAge: number;
  now: Date;
}): CountdownResult {
  const { birthdayValue, targetAge, now } = args;
  const empty: CountdownResult = {
    status: 'incomplete',
    progress: 0,
    breakdown: null,
    targetDate: null,
    totalMs: 0,
    elapsedMs: 0,
    remainingMs: 0,
    currentAge: 0,
  };

  const birthday = parseLocalDate(birthdayValue);
  if (!birthday) return empty;

  if (!Number.isInteger(targetAge) || targetAge < MIN_TARGET_AGE || targetAge > MAX_TARGET_AGE) {
    return { ...empty, status: 'invalid-age' };
  }

  if (birthday.getTime() > now.getTime()) {
    return { ...empty, status: 'future-birthday' };
  }

  const targetDate = makeAnniversaryDate(
    birthday.getFullYear() + targetAge,
    birthday.getMonth() + 1,
    birthday.getDate(),
  );

  const totalMs = targetDate.getTime() - birthday.getTime();
  const elapsedMs = now.getTime() - birthday.getTime();
  const remainingMs = Math.max(0, targetDate.getTime() - now.getTime());
  const progress = totalMs > 0 ? clamp((elapsedMs / totalMs) * 100, 0, 100) : 100;
  const currentAge = clamp((progress / 100) * targetAge, 0, targetAge);

  if (targetDate.getTime() - now.getTime() <= 0) {
    return {
      status: 'reached',
      progress,
      breakdown: null,
      targetDate: null,
      totalMs,
      elapsedMs,
      remainingMs: 0,
      currentAge: targetAge,
    };
  }

  return {
    status: 'ok',
    progress,
    breakdown: calendarBreakdown(now, targetDate),
    targetDate,
    totalMs,
    elapsedMs,
    remainingMs,
    currentAge,
  };
}

// ── UI ──

type VisualMode = 'ring' | 'countdown' | 'grid' | 'bar';

const MODES: { key: VisualMode; label: string; icon: typeof CircleDot }[] = [
  { key: 'ring', label: 'リング', icon: CircleDot },
  { key: 'countdown', label: 'カウントダウン', icon: Hourglass },
  { key: 'grid', label: 'グリッド', icon: Grid3x3 },
  { key: 'bar', label: 'バー', icon: Minus },
];

const MODE_LABELS: Record<VisualMode, string> = {
  ring: '進捗リング',
  countdown: 'カウントダウン',
  grid: '年グリッド',
  bar: '進捗バー',
};

const UNITS: { key: keyof CountdownBreakdown; label: string }[] = [
  { key: 'years', label: '年' },
  { key: 'months', label: 'ヶ月' },
  { key: 'days', label: '日' },
  { key: 'hours', label: '時間' },
  { key: 'minutes', label: '分' },
  { key: 'seconds', label: '秒' },
];

const GENTLE_MESSAGE: Record<Exclude<CountdownStatus, 'ok'>, string> = {
  incomplete: '生年月日と目標寿命を入力すると、残り時間が表示されます。',
  'invalid-age': `目標寿命は ${MIN_TARGET_AGE}〜${MAX_TARGET_AGE} の範囲で入力してください。`,
  'future-birthday': 'これからの誕生日ですね。今日までに迎えた生年月日を入力すると、残り時間が表示されます。',
  reached: '設定した目標寿命の年齢を、すでに迎えているようです。ここからの時間も、あなたのものです。',
};

// ── モード切替 ──

function ModeSelector({
  mode,
  onChange,
}: {
  mode: VisualMode;
  onChange: (mode: VisualMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="表示モードの切り替え">
      {MODES.map(({ key, label, icon: Icon }) => {
        const active = key === mode;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`flex items-center justify-center gap-1.5 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-line bg-canvas text-muted hover:border-brand-500 hover:text-brand-700'
            }`}
          >
            <Icon size={16} aria-hidden="true" strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── リング表示（デフォルト）──

function RingView({ progress, targetAge }: { progress: number; targetAge: number }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-52 w-52">
        <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
          <circle cx="100" cy="100" r={radius} className="stroke-brand-50" strokeWidth="12" fill="none" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-brand-500 transition-[stroke-dashoffset] duration-700 ease-out"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold tabular-nums text-ink">
            {progress.toFixed(1)}
            <span className="text-xl">%</span>
          </span>
          <span className="mt-1 text-xs tracking-wide text-muted">{targetAge}歳まで</span>
        </div>
      </div>
    </div>
  );
}

// ── カウントダウン表示（秒まで動く）──

function CountdownView({ breakdown }: { breakdown: CountdownBreakdown }) {
  return (
    <div>
      <p className="text-center text-sm font-semibold text-muted">目標寿命まで、あと</p>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {UNITS.map(({ key, label }) => (
          <div key={key} className="rounded-[12px] border border-line bg-canvas px-2 py-3 text-center">
            <div className="font-display text-2xl font-semibold tabular-nums text-ink md:text-3xl">
              {breakdown[key].toLocaleString('ja-JP')}
            </div>
            <div className="mt-1 text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── グリッド表示（1年=1マス）──

function GridView({ targetAge, currentAge }: { targetAge: number; currentAge: number }) {
  const completedYears = Math.floor(currentAge);
  const currentYearProgress = currentAge - completedYears;
  const remainingYears = Math.max(0, targetAge - completedYears);
  const cells = Array.from({ length: targetAge }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid w-full max-w-[320px] gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${targetAge <= 50 ? 7 : targetAge <= 80 ? 9 : 12}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {cells.map((year) => {
          if (year <= completedYears) {
            return <span key={year} className="aspect-square rounded-[2px] bg-brand-500" />;
          }
          if (year === completedYears + 1) {
            return (
              <span
                key={year}
                className="relative aspect-square overflow-hidden rounded-[2px] border border-brand-500 bg-brand-50"
              >
                <span
                  className="absolute inset-x-0 bottom-0 bg-brand-500/60"
                  style={{ height: `${currentYearProgress * 100}%` }}
                />
              </span>
            );
          }
          return <span key={year} className="aspect-square rounded-[2px] bg-brand-50" />;
        })}
      </div>

      {/* 凡例。色だけに依存しないよう文字で示す。 */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-brand-500" aria-hidden="true" />
          経過 <span className="font-semibold text-ink">{completedYears}年</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-brand-500 bg-brand-50" aria-hidden="true" />
          今年
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-brand-50" aria-hidden="true" />
          残り <span className="font-semibold text-ink">{remainingYears}年</span>
        </span>
      </div>
    </div>
  );
}

// ── バー表示（既存表示の継続）──

function BarView({ progress, targetAge }: { progress: number; targetAge: number }) {
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>誕生</span>
        <span>{targetAge}歳</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-pill bg-brand-50"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="人生の進捗"
      >
        <div
          className="h-full rounded-pill bg-brand-500 transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-center font-display text-3xl font-semibold tabular-nums text-ink">
        {progress.toFixed(1)}
        <span className="text-lg">%</span>
      </p>
    </div>
  );
}

// ── 静的サマリ（唯一の aria-live 対象。毎秒の数値は含めない）──

function ResultSummary({
  mode,
  targetAge,
  progress,
  remainingMs,
}: {
  mode: VisualMode;
  targetAge: number;
  progress: number;
  remainingMs: number;
}) {
  const remainingDays = Math.floor(remainingMs / MS_PER_DAY);
  return (
    <p className="mt-4 text-center text-sm leading-7 text-muted" aria-live="polite">
      {MODE_LABELS[mode]}で表示中。目標の{targetAge}歳まで、人生の約{Math.round(progress)}%を歩んでいます。残りおよそ
      {remainingDays.toLocaleString('ja-JP')}日です。
    </p>
  );
}

export function LifeCountdownToolPage() {
  const [birthday, setBirthday] = useState('');
  const [targetAgeInput, setTargetAgeInput] = useState('80');
  const [visualMode, setVisualMode] = useState<VisualMode>('ring');
  // SSR安全: 時刻依存の値は mounted 後にだけ表示する。初期stateは時刻非依存。
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetAge = Number(targetAgeInput);
  const result = now
    ? calculateLifeCountdown({ birthdayValue: birthday, targetAge, now })
    : null;
  const isOk = result?.status === 'ok';

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-gutter pb-16 pt-2">
        <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
          人生の残り時間を計算する
        </h1>
        <p className="mt-4 text-[15px] leading-8 text-ink">
          生年月日と、自分で決めた目標寿命を入力してみてください。焦らせるためではなく、限りある時間をそっと見つめ直すためのツールです。
        </p>

        {/* 入力＋計算カード */}
        <section className="mt-8 rounded-card border border-line bg-surface p-6 shadow-soft md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
              生年月日
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="rounded-[12px] border border-line bg-canvas px-4 py-3 text-base font-normal text-ink shadow-soft focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
              目標寿命（歳）
              <input
                type="number"
                inputMode="numeric"
                min={MIN_TARGET_AGE}
                max={MAX_TARGET_AGE}
                step={1}
                value={targetAgeInput}
                onChange={(e) => setTargetAgeInput(e.target.value)}
                className="rounded-[12px] border border-line bg-canvas px-4 py-3 text-base font-normal text-ink shadow-soft focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </label>
          </div>

          {/* 初回体験。クリック時にだけ固定の例をセットする（SSR初期描画は new Date() に依存しない）。 */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setBirthday('1994-01-01');
                setTargetAgeInput('80');
              }}
              className="rounded-pill border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              例で見てみる
            </button>
            <span className="text-xs text-muted">入力内容はこの端末内だけで計算され、保存・送信されません。</span>
          </div>

          {/* 結果表示。mounted 後（now あり）かつ ok のときだけライブ表示。 */}
          <div className="mt-7">
            {isOk && result && result.breakdown ? (
              <>
                <ModeSelector mode={visualMode} onChange={setVisualMode} />
                <ResultSummary
                  mode={visualMode}
                  targetAge={targetAge}
                  progress={result.progress}
                  remainingMs={result.remainingMs}
                />
                <div className="mt-6">
                  {visualMode === 'ring' && <RingView progress={result.progress} targetAge={targetAge} />}
                  {visualMode === 'countdown' && <CountdownView breakdown={result.breakdown} />}
                  {visualMode === 'grid' && <GridView targetAge={targetAge} currentAge={result.currentAge} />}
                  {visualMode === 'bar' && <BarView progress={result.progress} targetAge={targetAge} />}
                </div>
              </>
            ) : (
              <p className="rounded-[12px] bg-brand-50/50 px-4 py-4 text-sm leading-7 text-ink" aria-live="polite">
                {result ? GENTLE_MESSAGE[result.status as Exclude<CountdownStatus, 'ok'>] : GENTLE_MESSAGE.incomplete}
              </p>
            )}
          </div>
        </section>

        {/* 補足 / YMYL注意 */}
        <section className="mt-8 rounded-card border border-line bg-surface/70 p-6 text-sm leading-7 text-ink md:p-7">
          <h2 className="font-display text-lg font-semibold text-ink">目標寿命と平均寿命について</h2>
          <p className="mt-3">
            PivotLogが大切にするのは、統計上の平均寿命ではなく、あなた自身が決める「目標寿命」です。何歳まで生きたいかを自分で選び、そこまでの時間を見つめることから始まります。
          </p>
          <p className="mt-3 text-muted">
            参考として、厚生労働省「令和6年（2024）簡易生命表」による平均寿命は、男性81.09年・女性87.13年です（出典：
            <a
              className="text-brand-700 underline underline-offset-2 transition hover:text-brand-500"
              href="https://www.mhlw.go.jp/toukei/saikin/hw/life/life24/"
              target="_blank"
              rel="noreferrer"
            >
              厚生労働省 令和6年簡易生命表
            </a>
            ）。これはあくまで統計値であり、個人の寿命を予測・保証するものではありません。
          </p>

          <details className="mt-4 border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink transition hover:text-brand-700">
              このツールの使い方と考え方
            </summary>
            <div className="mt-3 space-y-3">
              <p>
                生年月日と目標寿命を入力すると、目標の年齢を迎えるまでの残り時間を、年・月・日・時・分・秒で表示します。表示は「リング」「カウントダウン」「グリッド」「バー」から選べ、進捗の見え方を切り替えられます。
              </p>
              <p>
                「リング」は進捗をひと目で、「カウントダウン」は秒まで動く実感を、「グリッド」は1年を1マスとした人生の俯瞰を、「バー」は誕生から目標歳までの歩みを示します。どのモードでも進捗の割合は同じです。
              </p>
              <p className="text-muted">
                この残り時間は、残りをせかすためのものではありません。今日という1日を、少しだけ大切に感じるきっかけになればと考えています。
              </p>
            </div>
          </details>
        </section>

        {/* ストアCTA */}
        <section className="mt-10 rounded-panel border border-line bg-surface px-6 py-8 text-center shadow-soft md:px-10">
          <h2 className="font-display text-2xl font-semibold leading-[1.4] text-ink md:text-3xl">
            残り時間を、毎日そっと隣に。
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ink">
            PivotLogなら、この残り時間をホーム画面やロック画面のウィジェットで確認しながら、3つの問いの日記で1日を振り返れます。基本無料。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <StoreBadge platform="ios" />
            <StoreBadge platform="android" />
          </div>
        </section>

        {/* ホーム導線 */}
        <p className="mt-8 text-center text-sm text-muted">
          <a className="text-brand-700 underline underline-offset-2 transition hover:text-brand-500" href="/">
            PivotLogについてもっと知る
          </a>
        </p>
      </article>
    </PageShell>
  );
}
