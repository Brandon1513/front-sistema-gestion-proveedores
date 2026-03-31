import React, { useState } from 'react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

/**
 * Botón de instalación PWA.
 * Se muestra automáticamente cuando el navegador detecta
 * que la app puede instalarse. Desaparece al instalar.
 */
export const PWAInstallButton = () => {
  const { canInstall, isInstalled, isInstalling, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // No mostrar si no se puede instalar, ya está instalada, o fue descartada
  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="mx-4 mb-3 p-3 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl shadow-lg">
      <div className="flex items-start gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg flex-shrink-0">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Instalar app</p>
          <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
            Accede más rápido desde tu dispositivo
          </p>
        </div>
        <button onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-white/60 hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={install}
        disabled={isInstalling}
        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-primary-700 text-xs font-bold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-70"
      >
        {isInstalling ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            Instalando...
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            Instalar SGP
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Banner pequeño — alternativa inline si prefieres mostrarlo
 * en el header en lugar del sidebar.
 */
export const PWAInstallBanner = () => {
  const { canInstall, isInstalling, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-600 text-white text-sm">
      <Smartphone className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-xs font-medium">
        Instala SGP para acceder más rápido
      </span>
      <button onClick={install} disabled={isInstalling}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1 bg-white text-primary-700 text-xs font-bold rounded-lg hover:bg-white/90 transition-colors">
        <Download className="w-3 h-3" />
        {isInstalling ? 'Instalando...' : 'Instalar'}
      </button>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 text-white/70 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};