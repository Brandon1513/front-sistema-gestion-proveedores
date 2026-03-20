import React from 'react';

export const Badge = ({ children, variant = 'info', className = '' }) => {
  const variantClasses = {
    // Estados de proveedor/documento
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-accent-100 text-accent-700 border-accent-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    alert: 'bg-alert-100 text-alert-700 border-alert-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    
    // Variantes moradas
    primary: 'bg-primary-100 text-primary-700 border-primary-200',
    
    // Estados específicos del sistema
    active: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-accent-100 text-accent-700 border-accent-200',
    inactive: 'bg-gray-100 text-gray-700 border-gray-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    expired: 'bg-alert-100 text-alert-700 border-alert-200',
  };

  return (
    <span 
      className={`
        inline-flex items-center px-3 py-1 
        rounded-full text-xs font-medium 
        border transition-colors
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};