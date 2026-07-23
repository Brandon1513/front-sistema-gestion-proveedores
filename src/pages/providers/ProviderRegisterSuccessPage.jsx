import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';

export const ProviderRegisterSuccessPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-primary-50 via-white to-pink-50">
      <div className="w-full max-w-md p-8 space-y-4 text-center bg-white shadow-lg rounded-2xl">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
          <CheckCircle className="w-8 h-8 text-green-600"/>
        </div>
        <h2 className="text-xl font-bold text-gray-900">¡Registro completado!</h2>
        <p className="text-sm text-gray-600">
          Tu solicitud de registro como proveedor fue enviada exitosamente. El equipo de Compras y Calidad
          revisará tu información y documentación antes de activar tu cuenta.
        </p>
        <div className="flex items-start gap-2 p-3 mt-2 text-left border border-blue-200 rounded-xl bg-blue-50">
          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-blue-700">
            Puedes iniciar sesión con tu correo y contraseña para dar seguimiento al estado de tu registro
            y comenzar a subir tus documentos.
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full px-6 py-3 mt-2 text-sm font-semibold text-white transition-colors bg-primary-600 rounded-xl hover:bg-primary-700"
        >
          Ir a iniciar sesión
        </button>
      </div>
    </div>
  );
};