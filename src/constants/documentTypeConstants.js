export const TEMPLATE_TYPES = [
  'General',
  'Cumarina',
  'Melamina',
  'Sulfitos',
  'Carta ingredientes Finales',
];

export const CATEGORY_OPTIONS = [
  { value: 'fiscal',    label: 'Fiscal',    color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { value: 'tecnico',   label: 'Técnico',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'technical', label: 'Technical', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'legal',     label: 'Legal',     color: 'bg-amber-100 text-amber-700 border-amber-200'    },
  { value: 'otro',      label: 'Otro',      color: 'bg-gray-100 text-gray-700 border-gray-200'       },
];

export const getCategoryStyle = (cat) =>
  CATEGORY_OPTIONS.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-700 border-gray-200';

export const EXPIRY_PRESETS = [
  { months: 1, label: '1 mes' }, { months: 2, label: '2 meses' },
  { months: 3, label: '3 meses' }, { months: 6, label: '6 meses' },
  { months: 9, label: '9 meses' }, { months: 12, label: '1 año' },
];

// Códigos que usan el sistema VIEJO de plantillas (workaround original).
// No se agregan más códigos aquí — los documentos nuevos usan
// GenericTemplatesSection directamente desde el modal.
export const TEMPLATE_DOC_CODES = ['carta_garantia', 'carta_no_trabajo_infantil'];