import api from './axios';

const downloadBlob = (response, fallbackName) => {
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

export const reportService = {
  // ── Reporte de Citas / Recepciones ──────────────────────────────────────
  getAppointmentsPreview: async (params = {}) => {
    const r = await api.get('/reports/appointments/preview', { params });
    return r.data;
  },
  downloadAppointmentsReport: async (params = {}) => {
    const r = await api.get('/reports/appointments/export', { params, responseType: 'blob' });
    downloadBlob(r, `reporte_citas_${Date.now()}.xlsx`);
  },

  // ── Reporte de Cumplimiento Documental ──────────────────────────────────
  getProvidersCompliancePreview: async (params = {}) => {
    const r = await api.get('/reports/providers-compliance/preview', { params });
    return r.data;
  },
  downloadProvidersComplianceReport: async (params = {}) => {
    const r = await api.get('/reports/providers-compliance/export', { params, responseType: 'blob' });
    downloadBlob(r, `reporte_cumplimiento_documental_${Date.now()}.xlsx`);
  },
};