import React from 'react';

export const Input = React.forwardRef(({ 
  label, 
  error,
  helperText,
  type = 'text',
  className = '',
  containerClassName = '',
  leftIcon,
  rightIcon,
  ...props 
}, ref) => {
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={props.id || props.name}
          className="block mb-2 text-sm font-semibold text-gray-700"
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {/* Input */}
        <input
          ref={ref}
          type={type}
          className={`
            block w-full px-4 py-3
            border-2 rounded-xl
            text-gray-900 placeholder-gray-400
            transition-all duration-200
            bg-white shadow-sm
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon ? 'pr-12' : ''}
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
              : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
            }
            focus:outline-none
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
        
        {/* Right Icon */}
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            {rightIcon}
          </div>
        )}
      </div>
      
      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500">
          {helperText}
        </p>
      )}
      
      {/* Error Message */}
      {error && (
        <p className="flex items-center gap-1 mt-2 text-sm text-red-600 animate-fade-in">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';