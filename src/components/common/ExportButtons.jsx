import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

/**
 * ExportButtons — botones de exportar a Excel y PDF
 *
 * Props:
 *   onExcelExport: async () => void
 *   onPdfExport:   async () => void
 *   disabled:      boolean
 *   label:         string (opcional, default "Exportar")
 */
export const ExportButtons = ({ onExcelExport, onPdfExport, disabled = false, label = 'Exportar' }) => {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf,   setLoadingPdf]   = useState(false);

  const handleExcel = async () => {
    setLoadingExcel(true);
    try { await onExcelExport(); } finally { setLoadingExcel(false); }
  };

  const handlePdf = async () => {
    setLoadingPdf(true);
    try { await onPdfExport(); } finally { setLoadingPdf(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium text-gray-500 sm:block">{label}:</span>

      {/* Excel */}
      <button
        onClick={handleExcel}
        disabled={disabled || loadingExcel || loadingPdf}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          bg-green-50 text-green-700 border border-green-300
          hover:bg-green-100 hover:border-green-400
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200"
        title="Exportar a Excel"
      >
        {loadingExcel
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileSpreadsheet className="w-3.5 h-3.5" />
        }
        Excel
      </button>

      {/* PDF */}
      <button
        onClick={handlePdf}
        disabled={disabled || loadingPdf || loadingExcel}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          bg-red-50 text-red-700 border border-red-300
          hover:bg-red-100 hover:border-red-400
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200"
        title="Exportar a PDF"
      >
        {loadingPdf
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileText className="w-3.5 h-3.5" />
        }
        PDF
      </button>
    </div>
  );
};