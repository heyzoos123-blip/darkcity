import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', glow = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'font-display rounded-lg transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            // Variants
            'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30': variant === 'primary',
            'bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30': variant === 'secondary',
            'bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30': variant === 'danger',
            'bg-text-muted/10 text-text-secondary hover:bg-text-muted/20': variant === 'ghost',
            
            // Glow effects
            'hover:shadow-glow-primary': variant === 'primary' && glow,
            'hover:shadow-glow-secondary': variant === 'secondary' && glow,
            
            // Sizes
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
