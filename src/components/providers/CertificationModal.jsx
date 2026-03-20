import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { AlertCircle, Award } from 'lucide-react';

export const CertificationModal = ({ isOpen, onClose, onSave, certification = null }) => {
  const [formData, setFormData] = useState({
    certification_type: '',
    other_name: '',
    certification_number: '',
    certifying_body: '',
    issue_date: '',
    expiry_date: '',
  });

  const certificationTypes = [
    { value: 'ISO 9001', label: 'ISO 9001 - Gestión de Calidad' },
    { value: 'ISO 14001', label: 'ISO 14001 - Gestión Ambiental' },
    { value: 'ISO 45001', label: 'ISO 45001 - Seguridad y Salud' },
    { value: 'FSSC 22000', label: 'FSSC 22000 - Seguridad Alimentaria' },
    { value: 'HACCP', label: 'HACCP - Análisis de Peligros' },
    { value: 'KOSHER', label: 'KOSHER - Certificación Kosher' },
    { value: 'HALAL', label: 'HALAL - Certificación Halal' },
    { value: 'Otro', label: 'Otro' },
  ];

  useEffect(() => {
    if (certification) {
      setFormData({
        certification_type: certification.certification_type || '',
        other_name: certification.other_name || '',
        certification_number: certification.certification_number || '',
        certifying_body: certification.certifying_body || '',
        issue_date: certification.issue_date ? certification.issue_date.split('T')[0] : '',
        expiry_date: certification.expiry_date ? certification.expiry_date.split('T')[0] : '',
      });
    } else {
      setFormData({
        certification_type: '',
        other_name: '',
        certification_number: '',
        certifying_body: '',
        issue_date: '',
        expiry_date: '',
      });
    }
  }, [certification, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Preparar datos - enviar null si las fechas están vacías
    const submitData = {
      certification_type: formData.certification_type,
      other_name: formData.other_name || null,
      certification_number: formData.certification_number || null,
      certifying_body: formData.certifying_body || null,
      issue_date: formData.issue_date || null,
      expiry_date: formData.expiry_date || null,
    };
    
    onSave(submitData);
  };

  const hasDateError = formData.issue_date && formData.expiry_date && 
    new Date(formData.expiry_date) < new Date(formData.issue_date);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-md bg-gradient-primary">
            <Award className="w-5 h-5 text-white" />
          </div>
          <span>{certification ? 'Editar Certificación' : 'Agregar Certificación'}</span>
        </div>
      }
      size="lg"
      footer={
        <>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant="primary"
            disabled={hasDateError}
            onClick={handleSubmit}
          >
            {certification ? 'Actualizar' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo de Certificación */}
        <Select
          label="Tipo de Certificación"
          name="certification_type"
          value={formData.certification_type}
          onChange={handleChange}
          options={certificationTypes}
          required
        />

        {/* Campo para "Otro" */}
        {formData.certification_type === 'Otro' && (
          <div className="animate-fade-in">
            <Input
              label="Nombre de la Certificación"
              name="other_name"
              value={formData.other_name}
              onChange={handleChange}
              required
              placeholder="Especifique el nombre de la certificación"
              helperText="Ingrese el nombre completo de la certificación"
            />
          </div>
        )}

        {/* Información de la certificación */}
        <div className="p-4 border rounded-xl bg-primary-50 border-primary-200">
          <p className="mb-3 text-sm font-semibold text-primary-900">
            Información del Certificado
          </p>
          <div className="space-y-4">
            <Input
              label="Número de Certificado"
              name="certification_number"
              value={formData.certification_number}
              onChange={handleChange}
              placeholder="Ej: MX-12345-2024"
              helperText="Número único de identificación del certificado"
            />

            <Input
              label="Organismo Certificador"
              name="certifying_body"
              value={formData.certifying_body}
              onChange={handleChange}
              placeholder="Ej: Bureau Veritas, SGS, DQS, TÜV"
              helperText="Entidad que emitió la certificación"
            />
          </div>
        </div>

        {/* Fechas */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-900">
            Vigencia del Certificado
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Fecha de Emisión"
              type="date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleChange}
            />

            <Input
              label="Fecha de Vencimiento"
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
            />
          </div>

          {/* Alerta de error en fechas */}
          {hasDateError && (
            <div className="flex items-start gap-3 p-4 border-2 border-red-300 rounded-xl bg-red-50 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Error en las fechas
                </p>
                <p className="mt-1 text-sm text-red-700">
                  La fecha de vencimiento debe ser posterior a la fecha de emisión
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Importante</p>
              <p>Asegúrate de que toda la información coincida con el certificado oficial. Esto será verificado por el área de Calidad.</p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};