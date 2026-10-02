import api from './axios';

export const accountStatementService = {
    // ── Proveedor ──
    getMyAccountStatement: async () => {
        const response = await api.get('/provider/account-statement');
        return response.data;
    },

    submitCreditNoteRequest: async (formData) => {
        const response = await api.post('/provider/credit-note-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    downloadMyCreditNoteFile: async (id, fallbackName = 'documento') => {
        const response = await api.get(`/provider/credit-note-requests/${id}/file`, {
        responseType: 'blob',
        });
        triggerBlobDownload(response, fallbackName);
    },

    downloadProviderNetSuiteFile: async (type, id, fallbackName = 'documento') => {
        const response = await api.get(`/provider/netsuite-files/${type}/${id}`, {
        responseType: 'blob',
        });
        triggerBlobDownload(response, fallbackName);
    },
    // ── Proveedor: responder con su CFDI ──
    respondToCreditNoteRequest: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/provider/credit-note-requests/${id}/respond`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
    },

    downloadMyResponseFile: async (id, fallbackName = 'cfdi') => {
    const response = await api.get(`/provider/credit-note-requests/${id}/response-file`, { responseType: 'blob' });
    triggerBlobDownload(response, fallbackName);
    },

    // ── Compras / Finanzas ──
    getFinanceAccountStatement: async (params = {}) => {
        const response = await api.get('/finance/account-statement', { params });
        return response.data;
    },

    // ── Finanzas: descargar el CFDI que subió el proveedor ──
    downloadProviderResponseFile: async (id, fallbackName = 'cfdi-proveedor') => {
    const response = await api.get(`/finance/credit-note-requests/${id}/response-file`, { responseType: 'blob' });
    triggerBlobDownload(response, fallbackName);
    },

    getCreditNoteRequests: async (params = {}) => {
        const response = await api.get('/finance/credit-note-requests', { params });
        return response.data;
    },

    reviewCreditNoteRequest: async (id, data) => {
        const response = await api.patch(`/finance/credit-note-requests/${id}/review`, data);
        return response.data;
    },

    downloadCreditNoteFile: async (id, fallbackName = 'documento') => {
        const response = await api.get(`/finance/credit-note-requests/${id}/file`, {
        responseType: 'blob',
        });
        triggerBlobDownload(response, fallbackName);
    },

    downloadFinanceNetSuiteFile: async (type, id, fallbackName = 'documento') => {
        const response = await api.get(`/finance/netsuite-files/${type}/${id}`, {
        responseType: 'blob',
        });
        triggerBlobDownload(response, fallbackName);
    },
    searchProviders: async (query) => {
    const response = await api.get('/finance/providers-search', { params: { q: query } });
    return response.data;
    },

    getMyInvoiceTimeline: async (id) => {
    const response = await api.get(`/provider/invoices/${id}/timeline`);
    return response.data;
    },

    getInvoiceTimelineFinance: async (id) => {
    const response = await api.get(`/finance/invoices/${id}/timeline`);
    return response.data;
    },

    
    createCreditNoteRequest: async (formData) => {
    const response = await api.post('/finance/credit-note-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
    },

    getPaymentRelatedInvoices: async (id) => (await api.get(`/provider/payments/${id}/related-invoices`)).data,
    getCreditMemoRelatedInvoices: async (id) => (await api.get(`/provider/credit-memos/${id}/related-invoices`)).data,

    getPaymentRelatedInvoicesFinance: async (id) => (await api.get(`/finance/payments/${id}/related-invoices`)).data,
    getCreditMemoRelatedInvoicesFinance: async (id) => (await api.get(`/finance/credit-memos/${id}/related-invoices`)).data,

    getFinanceDashboardKpis: async () => (await api.get('/finance/dashboard-kpis')).data,


    exportMyAccountStatement: async () => {
    const response = await api.get('/provider/account-statement/export', { responseType: 'blob' });
    triggerBlobDownload(response, `estado-cuenta-${Date.now()}.xlsx`);
    },

    exportFinanceAccountStatement: async (providerId = null) => {
    const response = await api.get('/finance/account-statement/export', {
        params: providerId ? { provider_id: providerId } : {},
        responseType: 'blob',
    });
    triggerBlobDownload(response, `reporte-cuentas-${Date.now()}.xlsx`);
    },

    syncProviderNow: async (providerId) => {
        const response = await api.post(`/finance/providers/${providerId}/sync-now`);
        return response.data;
        },

    // ── Facturas subidas por el proveedor ──
getMyInvoiceSubmissions: async () => {
  const response = await api.get('/provider/invoice-submissions');
  return response.data;
},

submitInvoice: async (pdf, xml) => {
  const formData = new FormData();
  formData.append('pdf', pdf);
  formData.append('xml', xml);
  const response = await api.post('/provider/invoice-submissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
},

downloadMySubmissionFile: async (id, kind, fallbackName = 'documento') => {
  const response = await api.get(`/provider/invoice-submissions/${id}/file/${kind}`, { responseType: 'blob' });
  triggerBlobDownload(response, fallbackName);
},

// ── Cuentas por Pagar / Finanzas ──
getInvoiceSubmissions: async (params = {}) => {
  const response = await api.get('/finance/invoice-submissions', { params });
  return response.data;
},

reviewInvoiceSubmission: async (id, data) => {
  const response = await api.patch(`/finance/invoice-submissions/${id}/review`, data);
  return response.data;
},

downloadSubmissionFile: async (id, kind, fallbackName = 'documento') => {
  const response = await api.get(`/finance/invoice-submissions/${id}/file/${kind}`, { responseType: 'blob' });
  triggerBlobDownload(response, fallbackName);
},    

// ── Complementos de pago del proveedor ──
getMyPaymentComplements: async () => {
  const response = await api.get('/provider/payment-complements');
  return response.data;
},

submitPaymentComplement: async (paymentId, pdf, xml) => {
  const formData = new FormData();
  formData.append('netsuite_vendor_payment_id', paymentId);
  formData.append('pdf', pdf);
  formData.append('xml', xml);
  const response = await api.post('/provider/payment-complements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
},

downloadMyComplementFile: async (id, kind, fallbackName = 'documento') => {
  const response = await api.get(`/provider/payment-complements/${id}/file/${kind}`, { responseType: 'blob' });
  triggerBlobDownload(response, fallbackName);
},

// ── Cuentas por Pagar / Finanzas ──
getPaymentComplements: async (params = {}) => {
  const response = await api.get('/finance/payment-complements', { params });
  return response.data;
},

reviewPaymentComplement: async (id, data) => {
  const response = await api.patch(`/finance/payment-complements/${id}/review`, data);
  return response.data;
},

downloadComplementFile: async (id, kind, fallbackName = 'documento') => {
  const response = await api.get(`/finance/payment-complements/${id}/file/${kind}`, { responseType: 'blob' });
  triggerBlobDownload(response, fallbackName);
},

};

/**
 * Descarga el blob usando el nombre de archivo real que manda el backend
 * en Content-Disposition (con su extensión correcta: .pdf, .jpg, .png, etc.)
 * En vez de forzar un nombre fijo desde el frontend, que ignoraría el tipo
 * real del archivo y podía dejarlo sin extensión o con la incorrecta.
 */
function triggerBlobDownload(axiosResponse, fallbackName) {
  const disposition = axiosResponse.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const url = window.URL.createObjectURL(new Blob([axiosResponse.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}