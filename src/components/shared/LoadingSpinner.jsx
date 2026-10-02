import React from 'react';

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 rounded-full border-primary-200 border-t-primary-600 animate-spin" />
  </div>
);