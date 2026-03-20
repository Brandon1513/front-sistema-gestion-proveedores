import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({ 
  children, 
  variant = 'primary',
  size = 'md',
  loading = false, 
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  leftIcon,
  rightIcon,
  ...props 
}, ref) => {
  
  // Variantes de botón con paleta corporativa
  const variants = {
    primary: `
      bg-gradient-primary hover:bg-gradient-primary-dark
      text-white shadow-primary hover:shadow-primary-lg
      disabled:from-gray-300 disabled:to-gray-400
    `,
    secondary: `
      bg-white border-2 border-primary text-primary
      hover:bg-primary hover:text-white
      shadow-sm hover:shadow-md
      disabled:border-gray-300 disabled:text-gray-400
    `,
    accent: `
      bg-gradient-accent hover:opacity-90
      text-white shadow-accent hover:shadow-lg
      disabled:from-gray-300 disabled:to-gray-400
    `,
    alert: `
      bg-gradient-alert hover:opacity-90
      text-white shadow-alert hover:shadow-lg
      disabled:from-gray-300 disabled:to-gray-400
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
      text-white shadow-md hover:shadow-lg
      disabled:from-gray-300 disabled:to-gray-400
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700
      text-white shadow-md hover:shadow-lg
      disabled:from-gray-300 disabled:to-gray-400
    `,
    ghost: `
      bg-transparent text-primary hover:bg-primary-50
      border-2 border-transparent hover:border-primary-100
      disabled:text-gray-400
    `,
    outline: `
      bg-transparent border-2 border-gray-300 text-gray-700
      hover:border-primary hover:text-primary hover:bg-primary-50
      disabled:border-gray-200 disabled:text-gray-400
    `,
  };

  // Tamaños
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold rounded-xl
    transition-all duration-200
    transform hover:scale-[1.02] active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
    disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none
  `;

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      )}
      
      {!loading && leftIcon && (
        <span className="flex-shrink-0 mr-2">{leftIcon}</span>
      )}
      
      {children}
      
      {!loading && rightIcon && (
        <span className="flex-shrink-0 ml-2">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';