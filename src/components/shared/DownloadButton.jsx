import React from 'react';
import { Download } from 'lucide-react';

export const DownloadButton = ({ onClick, loading }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={loading}
    className="flex items-center gap-1.5 text-primary-600 hover:text-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
    title="Descargar archivo"
  >
    {loading ? (
      <div className="w-4 h-4 border-2 rounded-full border-primary-300 border-t-primary-600 animate-spin" />
    ) : (
      <Download className="w-4 h-4" />
    )}
  </button>
);