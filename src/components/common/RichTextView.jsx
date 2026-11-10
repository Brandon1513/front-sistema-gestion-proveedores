import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { RICH_TEXT_CLASSES } from './RichTextEditor';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote'];
const isHtml = (v) => /<(p|ul|ol|li|strong|em|br|h3|h4|b|i|u|s|blockquote)\b/i.test(v || '');

/**
 * Muestra texto enriquecido de forma segura.
 * El HTML se limpia otra vez aquí (además del back). El texto plano de
 * registros anteriores se muestra respetando sus saltos de línea.
 */
export const RichTextView = ({ value, className = '' }) => {
  const html = useMemo(
    () => (isHtml(value) ? DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR: [] }) : null),
    [value]
  );

  if (!value) return <p className={`text-sm text-gray-400 ${className}`}>—</p>;
  if (!html) return <p className={`text-sm text-gray-800 whitespace-pre-line ${className}`}>{value}</p>;

  return <div className={`text-sm text-gray-800 ${RICH_TEXT_CLASSES} ${className}`} dangerouslySetInnerHTML={{ __html: html }}/>;
};