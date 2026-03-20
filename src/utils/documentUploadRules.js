/**
 * Determina si un documento puede ser subido/renovado.
 *
 * Reglas:
 * - Sin cargar → permitido
 * - Rechazado  → permitido (necesita corregirse)
 * - Pendiente  → BLOQUEADO (ya está en revisión)
 * - Aprobado + vence en > 30 días → BLOQUEADO (está vigente)
 * - Aprobado + vence en ≤ 30 días → permitido (próximo a vencer)
 * - Aprobado + ya venció           → permitido (necesita renovarse)
 * - Aprobado + sin fecha           → BLOQUEADO (no vence, está vigente)
 */
export const canUploadDocument = (doc) => {
  if (!doc) return { allowed: false, reason: 'Documento no encontrado' };

  // Sin cargar
  if (!doc.uploaded || !doc.uploaded_document) {
    return { allowed: true, reason: null };
  }

  const { status, expiry_date } = doc.uploaded_document;

  // Rechazado — siempre permitido
  if (status === 'rejected') {
    return { allowed: true, reason: null };
  }

  // Pendiente — bloqueado, esperar respuesta de Calidad
  if (status === 'pending') {
    return {
      allowed: false,
      reason: 'Este documento está en revisión por Calidad. Espera la respuesta antes de subir uno nuevo.',
    };
  }

  // Aprobado — verificar vigencia
  if (status === 'approved') {
    if (!expiry_date) {
      // Sin fecha de vencimiento = documento permanente
      return {
        allowed: false,
        reason: 'Este documento está aprobado y vigente. No requiere renovación.',
      };
    }

    const daysLeft = Math.ceil(
      (new Date(expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 30) {
      return {
        allowed: false,
        reason: `Este documento está vigente por ${daysLeft} días más. Podrás renovarlo cuando queden 30 días o menos.`,
      };
    }

    // ≤ 30 días o ya venció
    return { allowed: true, reason: null };
  }

  return { allowed: true, reason: null };
};

/**
 * Devuelve los días restantes de un documento (negativo si ya venció).
 */
export const getDaysLeft = (expiry_date) => {
  if (!expiry_date) return null;
  return Math.ceil((new Date(expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
};