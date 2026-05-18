import React, { useState } from 'react';
import { Download, BookOpen, HelpCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const MANUAL_URL = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost'}/docs/manual_proveedor.pdf`;

const FAQ_ITEMS = [
  {
    q: '¿Cómo cargo un documento?',
    a: 'Ve a "Cargar Documentos" en el menú lateral, selecciona el tipo de documento, el producto al que aplica (si es requerido) y arrastra o selecciona tu archivo. El documento será enviado a revisión de Calidad.',
  },
  {
    q: '¿Cuánto tiempo tarda en validarse mi documento?',
    a: 'El área de Calidad revisará tu documento a la brevedad. Recibirás una notificación por correo cuando sea aprobado o rechazado.',
  },
  {
    q: '¿Qué hago si mi documento fue rechazado?',
    a: 'Revisa el comentario de rechazo en "Mis Documentos", corrige lo indicado y sube el documento nuevamente.',
  },
  {
    q: '¿Cómo sé cuándo vence un documento?',
    a: 'El sistema te notificará automáticamente por correo y en la campana de notificaciones cuando un documento esté próximo a vencer. También puedes revisarlo en "Mis Documentos".',
  },
  {
    q: '¿Puedo subir varios productos en un mismo documento?',
    a: 'No. Para documentos como Fichas Técnicas o Cartas Garantía debes subir un archivo por cada producto. El sistema te pedirá seleccionar el producto al que corresponde cada archivo.',
  },
  {
    q: '¿Cómo actualizo mis datos de contacto?',
    a: 'Ve a "Mi Perfil" en el menú lateral y actualiza la información que necesites.',
  },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden border-2 border-gray-100 rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-4 text-left transition-colors bg-white hover:bg-gray-50">
        <span className="text-sm font-semibold text-gray-800">{q}</span>
        {open
          ? <ChevronUp className="flex-shrink-0 w-4 h-4 text-gray-400"/>
          : <ChevronDown className="flex-shrink-0 w-4 h-4 text-gray-400"/>
        }
      </button>
      {open && (
        <div className="px-5 py-4 text-sm text-gray-600 border-t border-gray-100 bg-gray-50">
          {a}
        </div>
      )}
    </div>
  );
};

export const ProviderHelpPage = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <HelpCircle className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Centro de Ayuda</h1>
            <p className="text-sm text-gray-600">Manual de usuario y preguntas frecuentes del portal de proveedores</p>
          </div>
        </div>
      </div>

      {/* Manual de usuario */}
      <div className="overflow-hidden bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <BookOpen className="w-4 h-4 text-white"/>
            </div>
            <div>
              <p className="font-bold text-gray-900">Manual de Usuario</p>
              <p className="text-xs text-gray-500">Guía completa de registro, carga de documentos y uso del portal</p>
            </div>
          </div>
          {/* Botón de descarga */}
          <a href={MANUAL_URL} download="manual_proveedor.pdf" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center flex-shrink-0 gap-2 px-4 py-2 text-sm font-semibold text-white transition-all shadow-sm rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
            <Download className="w-4 h-4"/>
            Descargar PDF
          </a>
        </div>

        {/* PDF embebido */}
        <div className="w-full bg-gray-100" style={{ height: '70vh' }}>
          <iframe
            src={`${MANUAL_URL}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full border-0"
            title="Manual de Usuario SGP"
            type="application/pdf">
            {/* Fallback si el navegador no soporta iframes de PDF */}
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
              <BookOpen className="w-12 h-12 opacity-40"/>
              <p className="text-sm">Tu navegador no puede mostrar el PDF directamente.</p>
              <a href={MANUAL_URL} download target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-primary">
                <Download className="w-4 h-4"/>Descargar Manual
              </a>
            </div>
          </iframe>
        </div>

        {/* Footer con link directo */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">¿Problemas para ver el PDF? Descárgalo directamente.</p>
          <a href={MANUAL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold transition-colors text-primary-600 hover:text-primary-800">
            <ExternalLink className="w-3 h-3"/>Abrir en nueva pestaña
          </a>
        </div>
      </div>

      {/* Preguntas frecuentes */}
      <div className="overflow-hidden bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
            <HelpCircle className="w-4 h-4 text-amber-600"/>
          </div>
          <div>
            <p className="font-bold text-gray-900">Preguntas Frecuentes</p>
            <p className="text-xs text-gray-500">Respuestas a las dudas más comunes</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a}/>
          ))}
        </div>
      </div>

      {/* Contacto */}
      <div className="p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg shadow-md">
            <HelpCircle className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h4 className="mb-1 font-bold text-blue-900">¿Necesitas más ayuda?</h4>
            <p className="text-sm text-blue-800">
              Si tienes dudas que no están resueltas en el manual o en las preguntas frecuentes,
              contacta al área de Compras o Calidad de DASAVENA directamente.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};