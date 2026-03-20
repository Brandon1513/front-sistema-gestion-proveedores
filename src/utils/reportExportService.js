/**
 * reportExportService.js
 * Exportación de reportes a Excel y PDF en el browser.
 * Dependencias (CDN, no requieren npm install):
 *   - SheetJS:  https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs
 *   - jsPDF:    https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 *   - autoTable: https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js
 *
 * Instalar con npm (recomendado):
 *   npm install xlsx jspdf jspdf-autotable
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
};

const STATUS_LABELS = {
  active:   'Activo',
  pending:  'Pendiente',
  inactive: 'Inactivo',
  rejected: 'Rechazado',
  approved: 'Aprobado',
  expired:  'Vencido',
};

const HEADER_COLOR  = [88, 28, 135];   // purple-900
const ACCENT_COLOR  = [124, 58, 237];  // purple-600
const GRAY_COLOR    = [243, 244, 246]; // gray-100
const WHITE         = [255, 255, 255];

const addPdfHeader = (doc, title, subtitle = '') => {
  // Barra superior morada
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, 210, 22, 'F');

  // Logo text
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SGP — Sistema de Gestión de Proveedores', 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 17);

  // Título del reporte
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, 41);
  }

  return subtitle ? 48 : 42;
};

const addExcelHeader = (ws, title, headers, rowStart = 1) => {
  // Título en A1
  ws[`A${rowStart}`] = { v: title, t: 's' };
  ws[`A${rowStart + 1}`] = { v: `Generado: ${new Date().toLocaleDateString('es-MX')}`, t: 's' };
  // Headers en fila 3
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + i);
    ws[`${col}${rowStart + 2}`] = { v: h, t: 's' };
  });
  return rowStart + 3;
};

// ─── 1. Lista de Proveedores ──────────────────────────────────────────────────

export const exportProvidersExcel = (providers) => {
  const title  = 'Lista de Proveedores';
  const headers = ['Razón Social', 'RFC', 'Tipo de Proveedor', 'Estado', 'Ciudad', 'Estado/Entidad', 'Email', 'Teléfono', 'Fecha de Registro'];

  const rows = providers.map(p => [
    p.business_name        || '—',
    p.rfc                  || '—',
    p.provider_type?.name  || '—',
    STATUS_LABELS[p.status] || p.status,
    p.city                 || '—',
    p.state                || '—',
    p.email                || '—',
    p.phone                || '—',
    formatDate(p.created_at),
  ]);

  const ws   = XLSX.utils.aoa_to_sheet([[title], [`Generado: ${new Date().toLocaleDateString('es-MX')}`], headers, ...rows]);
  const wb   = XLSX.utils.book_new();

  // Ancho de columnas
  ws['!cols'] = [30, 16, 28, 14, 18, 18, 30, 16, 18].map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
  XLSX.writeFile(wb, `proveedores_${Date.now()}.xlsx`);
};

export const exportProvidersPDF = (providers) => {
  const doc      = new jsPDF({ orientation: 'landscape' });
  const startY   = addPdfHeader(doc, 'Lista de Proveedores', `Total: ${providers.length} proveedores`);

  autoTable(doc, {
    startY,
    head: [['Razón Social', 'RFC', 'Tipo', 'Estado', 'Ciudad', 'Email', 'Teléfono', 'Registro']],
    body: providers.map(p => [
      p.business_name       || '—',
      p.rfc                 || '—',
      p.provider_type?.name || '—',
      STATUS_LABELS[p.status] || p.status,
      p.city                || '—',
      p.email               || '—',
      p.phone               || '—',
      formatDate(p.created_at),
    ]),
    headStyles:   { fillColor: HEADER_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: GRAY_COLOR },
    bodyStyles:   { fontSize: 8, textColor: [30, 30, 30] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 22 }, 5: { cellWidth: 40 } },
    margin:       { left: 14, right: 14 },
  });

  doc.save(`proveedores_${Date.now()}.pdf`);
};

// ─── 2. Documentos próximos a vencer ─────────────────────────────────────────

export const exportExpiringDocsExcel = (documents) => {
  const title   = 'Documentos Próximos a Vencer';
  const headers = ['Proveedor', 'RFC', 'Tipo de Proveedor', 'Documento', 'Estado Doc.', 'Fecha Carga', 'Fecha Vencimiento', 'Días Restantes'];

  const rows = documents.map(d => {
    const daysLeft = d.expiry_date
      ? Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    return [
      d.provider?.business_name  || '—',
      d.provider?.rfc            || '—',
      d.provider?.provider_type?.name || '—',
      d.document_type?.name      || '—',
      STATUS_LABELS[d.status]    || d.status,
      formatDate(d.created_at),
      formatDate(d.expiry_date),
      daysLeft !== null ? daysLeft : '—',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([[title], [`Generado: ${new Date().toLocaleDateString('es-MX')}`], headers, ...rows]);
  ws['!cols'] = [32, 16, 28, 32, 14, 16, 18, 14].map(w => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Docs por Vencer');
  XLSX.writeFile(wb, `docs_por_vencer_${Date.now()}.xlsx`);
};

export const exportExpiringDocsPDF = (documents) => {
  const doc    = new jsPDF({ orientation: 'landscape' });
  const startY = addPdfHeader(doc, 'Documentos Próximos a Vencer', `Total: ${documents.length} documentos`);

  autoTable(doc, {
    startY,
    head: [['Proveedor', 'RFC', 'Documento', 'Estado', 'Cargado', 'Vence', 'Días restantes']],
    body: documents.map(d => {
      const daysLeft = d.expiry_date
        ? Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
        : '—';
      return [
        d.provider?.business_name || '—',
        d.provider?.rfc           || '—',
        d.document_type?.name     || '—',
        STATUS_LABELS[d.status]   || d.status,
        formatDate(d.created_at),
        formatDate(d.expiry_date),
        daysLeft,
      ];
    }),
    headStyles:   { fillColor: HEADER_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: GRAY_COLOR },
    bodyStyles:   { fontSize: 8 },
    didDrawCell: (data) => {
      // Colorear días restantes en rojo si son ≤ 7
      if (data.column.index === 6 && data.section === 'body') {
        const val = parseInt(data.cell.raw);
        if (!isNaN(val) && val <= 7) {
          doc.setTextColor(220, 38, 38);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(String(val), data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1);
          doc.setTextColor(30, 30, 30);
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`docs_por_vencer_${Date.now()}.pdf`);
};

// ─── 3. Reporte completo de un proveedor ─────────────────────────────────────

export const exportProviderReportExcel = (provider, documents = []) => {
  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Información general ──
  const infoData = [
    ['REPORTE DE PROVEEDOR'],
    [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
    [],
    ['INFORMACIÓN GENERAL'],
    ['Razón Social',        provider.business_name        || '—'],
    ['RFC',                 provider.rfc                  || '—'],
    ['Nombre Comercial',    provider.trade_name           || '—'],
    ['Tipo de Proveedor',   provider.provider_type?.name  || '—'],
    ['Estado',              STATUS_LABELS[provider.status] || provider.status],
    ['Email',               provider.email                || '—'],
    ['Teléfono',            provider.phone                || '—'],
    [],
    ['DIRECCIÓN'],
    ['Calle',               `${provider.street || ''} ${provider.exterior_number || ''}`.trim() || '—'],
    ['Colonia',             provider.neighborhood         || '—'],
    ['Ciudad',              provider.city                 || '—'],
    ['Estado/Entidad',      provider.state                || '—'],
    ['Código Postal',       provider.postal_code          || '—'],
    [],
    ['INFORMACIÓN BANCARIA'],
    ['Banco',               provider.bank                 || '—'],
    ['CLABE',               provider.clabe                || '—'],
    ['Cuenta',              provider.account_number       || '—'],
    [],
    ['CRÉDITO'],
    ['Días de Crédito',     provider.credit_days          || '—'],
    ['Monto de Crédito',    provider.credit_amount        || '—'],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(infoData);
  ws1['!cols'] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Información General');

  // ── Hoja 2: Documentos ──
  const docHeaders = ['Documento', 'Estado', 'Fecha Carga', 'Fecha Vencimiento', 'Días Restantes', 'Versión', 'Archivo'];
  const docRows = documents.map(d => {
    const daysLeft = d.expiry_date
      ? Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
      : '—';
    return [
      d.document_type?.name  || '—',
      STATUS_LABELS[d.status] || d.status,
      formatDate(d.created_at),
      formatDate(d.expiry_date),
      daysLeft,
      d.version              || 1,
      d.original_filename    || '—',
    ];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([
    [`Documentos — ${provider.business_name}`],
    [`Total: ${documents.length}`],
    docHeaders,
    ...docRows,
  ]);
  ws2['!cols'] = [32, 14, 16, 18, 14, 10, 36].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Documentos');

  // ── Hoja 3: Contactos ──
  if (provider.contacts?.length > 0) {
    const contactHeaders = ['Tipo', 'Nombre', 'Puesto', 'Email', 'Teléfono'];
    const contactRows = provider.contacts.map(c => [
      c.type || '—', c.name || '—', c.position || '—', c.email || '—', c.phone || '—',
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([contactHeaders, ...contactRows]);
    ws3['!cols'] = [14, 28, 20, 32, 16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws3, 'Contactos');
  }

  XLSX.writeFile(wb, `reporte_${(provider.business_name || 'proveedor').replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
};

export const exportProviderReportPDF = (provider, documents = []) => {
  const doc    = new jsPDF();
  let   startY = addPdfHeader(
    doc,
    provider.business_name || 'Proveedor',
    `RFC: ${provider.rfc || '—'} · ${provider.provider_type?.name || '—'} · Estado: ${STATUS_LABELS[provider.status] || provider.status}`
  );

  // Información general en dos columnas
  const infoLeft = [
    ['Email',     provider.email     || '—'],
    ['Teléfono',  provider.phone     || '—'],
    ['Ciudad',    provider.city      || '—'],
    ['Estado',    provider.state     || '—'],
    ['C.P.',      provider.postal_code || '—'],
  ];
  const infoRight = [
    ['Banco',     provider.bank          || '—'],
    ['CLABE',     provider.clabe         || '—'],
    ['Días cred.',provider.credit_days   || '—'],
    ['Monto',     provider.credit_amount || '—'],
    ['Rep. Legal',provider.legal_representative || '—'],
  ];

  autoTable(doc, {
    startY,
    head:        [['Campo', 'Valor', 'Campo', 'Valor']],
    body:        infoLeft.map((row, i) => [...row, ...(infoRight[i] || ['', ''])]),
    headStyles:  { fillColor: ACCENT_COLOR, textColor: WHITE, fontSize: 8 },
    bodyStyles:  { fontSize: 8 },
    alternateRowStyles: { fillColor: GRAY_COLOR },
    margin:      { left: 14, right: 14 },
    tableWidth:  182,
  });

  // Tabla de documentos
  startY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Documentos', 14, startY);
  startY += 4;

  if (documents.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Sin documentos cargados', 14, startY + 6);
  } else {
    autoTable(doc, {
      startY,
      head:  [['Documento', 'Estado', 'Cargado', 'Vence', 'Días rest.', 'Ver.']],
      body:  documents.map(d => {
        const daysLeft = d.expiry_date
          ? Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
          : '—';
        return [
          d.document_type?.name   || '—',
          STATUS_LABELS[d.status] || d.status,
          formatDate(d.created_at),
          formatDate(d.expiry_date),
          daysLeft,
          d.version || 1,
        ];
      }),
      headStyles:         { fillColor: HEADER_COLOR, textColor: WHITE, fontSize: 8 },
      alternateRowStyles: { fillColor: GRAY_COLOR },
      bodyStyles:         { fontSize: 8 },
      margin:             { left: 14, right: 14 },
    });
  }

  // Contactos (si hay)
  if (provider.contacts?.length > 0) {
    startY = doc.lastAutoTable?.finalY + 10 || startY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Contactos', 14, startY);

    autoTable(doc, {
      startY: startY + 4,
      head:   [['Tipo', 'Nombre', 'Puesto', 'Email', 'Teléfono']],
      body:   provider.contacts.map(c => [c.type || '—', c.name || '—', c.position || '—', c.email || '—', c.phone || '—']),
      headStyles:   { fillColor: ACCENT_COLOR, textColor: WHITE, fontSize: 8 },
      bodyStyles:   { fontSize: 8 },
      alternateRowStyles: { fillColor: GRAY_COLOR },
      margin: { left: 14, right: 14 },
    });
  }

  // Número de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
  }

  doc.save(`reporte_${(provider.business_name || 'proveedor').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};