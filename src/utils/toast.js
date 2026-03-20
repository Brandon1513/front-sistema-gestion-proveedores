// src/config/toastConfig.js
import toast from 'react-hot-toast';

// Configuración global de toast con paleta corporativa
export const toastConfig = {
  duration: 4000,
  position: 'top-right',
  
  // Estilos personalizados
  style: {
    borderRadius: '12px',
    background: '#fff',
    color: '#374151',
    padding: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '500px',
  },

  // Estilos para cada tipo
  success: {
    duration: 4000,
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
    style: {
      border: '2px solid #10b981',
    },
  },

  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
    style: {
      border: '2px solid #ef4444',
    },
  },

  loading: {
    iconTheme: {
      primary: '#6A2C75', // Primary color
      secondary: '#fff',
    },
  },
};

// Funciones helper personalizadas
export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      ...toastConfig.success,
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      ...toastConfig.error,
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      ...toastConfig.loading,
      ...options,
    });
  },

  promise: (promise, messages) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || 'Procesando...',
        success: messages.success || '¡Éxito!',
        error: messages.error || 'Ocurrió un error',
      },
      {
        success: {
          ...toastConfig.success,
        },
        error: {
          ...toastConfig.error,
        },
        loading: {
          ...toastConfig.loading,
        },
      }
    );
  },

  custom: (message, options = {}) => {
    return toast(message, {
      ...toastConfig,
      ...options,
    });
  },

  // Toast personalizado para operaciones de proveedor
  providerUpdate: () => {
    return toast.success('Información actualizada correctamente', {
      ...toastConfig.success,
      icon: '✓',
    });
  },

  providerCreated: (name) => {
    return toast.success(`${name} agregado exitosamente`, {
      ...toastConfig.success,
      icon: '🎉',
    });
  },

  providerDeleted: (name) => {
    return toast.success(`${name} eliminado correctamente`, {
      ...toastConfig.success,
      icon: '🗑️',
    });
  },

  documentUploaded: () => {
    return toast.success('Documento subido correctamente', {
      ...toastConfig.success,
      icon: '📄',
    });
  },

  warning: (message) => {
    return toast(message, {
      icon: '⚠️',
      style: {
        ...toastConfig.style,
        border: '2px solid #D6A644', // Accent color
      },
    });
  },
};

// Para usar en los componentes
export default showToast;