import React from 'react';

export const Table = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 shadow-sm rounded-xl">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHead = ({ children }) => {
  return (
    <thead className="bg-gradient-to-r from-primary-50 to-primary-100">
      <tr>{children}</tr>
    </thead>
  );
};

export const TableBody = ({ children, striped = false }) => {
  return (
    <tbody className={`bg-white divide-y divide-gray-200 ${striped ? '[&>tr:nth-child(even)]:bg-gray-50' : ''}`}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className = '', onClick, hover = true }) => {
  return (
    <tr 
      onClick={onClick}
      className={`
        ${hover ? 'hover:bg-primary-50 transition-colors' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </tr>
  );
};

export const TableHeader = ({ children, className = '', align = 'left' }) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      className={`
        px-6 py-4 
        text-xs font-semibold text-primary-700 
        uppercase tracking-wider
        ${alignClasses[align]}
        ${className}
      `}
    >
      {children}
    </th>
  );
};

export const TableCell = ({ children, className = '', align = 'left' }) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td 
      className={`
        px-6 py-4 
        text-sm text-gray-900
        ${alignClasses[align]}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

// Componente de tabla vacía
export const EmptyTable = ({ message = 'No hay datos disponibles', icon }) => {
  return (
    <tr>
      <td colSpan="100" className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center">
          {icon && (
            <div className="w-16 h-16 mb-4 text-gray-400">
              {icon}
            </div>
          )}
          <p className="font-medium text-gray-500">{message}</p>
        </div>
      </td>
    </tr>
  );
};

// Componente de loading
export const TableLoading = ({ columns = 5, rows = 5 }) => {
  return (
    <>
      {[...Array(rows)].map((_, rowIndex) => (
        <tr key={rowIndex}>
          {[...Array(columns)].map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </TableCell>
          ))}
        </tr>
      ))}
    </>
  );
};