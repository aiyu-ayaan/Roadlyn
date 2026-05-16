import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'focus-ring flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 text-sm shadow-sm transition placeholder:text-muted-foreground focus:border-blue-400/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'focus-ring min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm shadow-sm transition placeholder:text-muted-foreground focus:border-blue-400/50 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
