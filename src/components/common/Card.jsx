import React from 'react';

export const Card = ({ 
  children, 
  title, 
  subtitle,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footer,
  variant = 'default'
}) => {
  
  const variants = {
    default: 'bg-white border border-gray-200',
    primary: 'bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200',
    accent: 'bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200',
    elevated: 'bg-white shadow-elevated',
  };

  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-200 ${variants[variant]} ${className}`}>
      {/* Header */}
      {(title || subtitle) && (
        <div className={`px-6 py-4 border-b border-gray-200 ${headerClassName}`}>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Body */}
      <div className={`px-6 py-4 ${bodyClassName}`}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};