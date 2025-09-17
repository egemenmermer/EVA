import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    // Basic styling, can be expanded with a utility like clsx and tailwind-variants
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    
    // Placeholder for variant and size styles - you'd implement these
    // e.g., using a switch statement or a library like cva
    let variantStyles = "";
    switch (variant) {
      case 'destructive':
        variantStyles = "bg-red-500 text-white hover:bg-red-600";
        break;
      case 'outline':
        variantStyles = "border border-input hover:bg-accent hover:text-accent-foreground";
        break;
      // Add other variants
      default:
        variantStyles = "bg-primary text-primary-foreground hover:bg-primary/90";
        break;
    }

    let sizeStyles = "";
    switch (size) {
      case 'sm':
        sizeStyles = "h-9 px-3";
        break;
      case 'lg':
        sizeStyles = "h-11 px-8";
        break;
      // Add other sizes
      default:
        sizeStyles = "h-10 py-2 px-4";
        break;
    }

    return (
      <button
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button }; 