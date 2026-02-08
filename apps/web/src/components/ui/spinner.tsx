interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-2',
} as const;

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${sizeStyles[size]} border-foreground-secondary border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
