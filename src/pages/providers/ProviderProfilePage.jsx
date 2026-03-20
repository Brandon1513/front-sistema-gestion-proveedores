import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { providerProfileService } from '../../api/providerProfileService';
import { GeneralInfoTab } from '../../components/providers/profile/GeneralInfoTab';
import { ContactsTab } from '../../components/providers/profile/ContactsTab';
import { VehiclesTab } from '../../components/providers/profile/VehiclesTab';
import { PersonnelTab } from '../../components/providers/profile/PersonnelTab';
import { User, Users, Truck, UserCheck } from 'lucide-react';

const VALID_TABS = ['general', 'contacts', 'vehicles', 'personnel'];

export const ProviderProfilePage = () => {
  // ✅ Leer ?tab= de la URL — si viene del dashboard ya abre el tab correcto
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'general';

  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerProfileService.getProfile,
  });

  const tabs = [
    { id: 'general',   name: 'Información General', icon: User      },
    { id: 'contacts',  name: 'Contactos',            icon: Users     },
    { id: 'vehicles',  name: 'Vehículos',            icon: Truck     },
    { id: 'personnel', name: 'Personal',             icon: UserCheck },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-primary-50 to-pink-50 border-primary-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg shadow-md bg-gradient-primary">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-sm text-gray-600">
              Gestiona tu información y mantén tus datos actualizados
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden bg-white border-2 border-gray-200 shadow-sm rounded-xl">
        <nav className="flex border-b-2 border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200
                  ${isActive
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          {activeTab === 'general'   && <GeneralInfoTab provider={profileData?.provider} />}
          {activeTab === 'contacts'  && <ContactsTab providerId={profileData?.provider?.id} />}
          {activeTab === 'vehicles'  && <VehiclesTab providerId={profileData?.provider?.id} />}
          {activeTab === 'personnel' && <PersonnelTab providerId={profileData?.provider?.id} />}
        </div>
      </div>
    </div>
  );
};