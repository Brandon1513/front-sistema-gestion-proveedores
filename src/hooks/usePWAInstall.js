import { useState, useEffect } from 'react';

/**
 * Hook para manejar la instalación de la PWA.
 * Captura el evento beforeinstallprompt y expone
 * una función para mostrar el prompt de instalación.
 */
export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [isInstalling,  setIsInstalling]  = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar cuando se instala exitosamente
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    canInstall:  !!installPrompt && !isInstalled,
    isInstalled,
    isInstalling,
    install,
  };
};