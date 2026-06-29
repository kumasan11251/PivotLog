import type { SVGProps } from 'react';

export type IconBaseProps = SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
};

export function IconBase({
  size = 24,
  title,
  children,
  fill = 'none',
  stroke = 'currentColor',
  strokeWidth = 1.8,
  ...props
}: IconBaseProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill={fill}
      height={size}
      role={title ? 'img' : undefined}
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}
