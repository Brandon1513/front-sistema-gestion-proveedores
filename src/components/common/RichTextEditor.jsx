import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Heading3, Undo, Redo } from 'lucide-react';

// Estilos del contenido (Tailwind quita los estilos de listas por defecto)
export const RICH_TEXT_CLASSES =
  '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 ' +
  '[&_li]:mb-0.5 [&_li_p]:mb-0 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic ' +
  '[&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h4]:font-bold [&_h4]:mt-2 [&_h4]:mb-1 ' +
  '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic';

/** Convierte texto plano (registros anteriores) a HTML para cargarlo en el editor */
const toEditorHtml = (value) => {
  if (!value) return '';
  if (/<(p|ul|ol|li|strong|em|br|h3|h4)\b/i.test(value)) return value;
  const esc = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.split(/\n{2,}/).map(par => `<p>${par.replace(/\n/g, '<br>')}</p>`).join('');
};

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} disabled={disabled} title={title}
    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}>
    {children}
  </button>
);

/**
 * Editor de texto enriquecido básico: negritas, cursivas, viñetas, numeración y subtítulo.
 * Al pegar desde Word conserva listas y negritas. Devuelve HTML (el back lo limpia al guardar).
 */
export const RichTextEditor = ({ value, onChange, placeholder = '', minHeight = 'min-h-[200px]' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: `px-3 py-2 text-sm text-gray-800 focus:outline-none ${minHeight} ${RICH_TEXT_CLASSES}`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  // Si el valor cambia desde fuera (p. ej. al precargar otra vuelta), sincronizar
  useEffect(() => {
    if (!editor) return;
    const incoming = toEditorHtml(value);
    if (incoming !== editor.getHTML() && !(editor.isEmpty && !incoming)) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden bg-white border-2 border-gray-200 rounded-xl focus-within:border-primary-400">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50">
        <ToolbarButton title="Negritas (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4"/></ToolbarButton>
        <ToolbarButton title="Cursivas (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4"/></ToolbarButton>
        <span className="w-px h-5 mx-1 bg-gray-300"/>
        <ToolbarButton title="Subtítulo" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4"/></ToolbarButton>
        <ToolbarButton title="Viñetas" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4"/></ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4"/></ToolbarButton>
        <span className="w-px h-5 mx-1 bg-gray-300"/>
        <ToolbarButton title="Deshacer (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo className="w-4 h-4"/></ToolbarButton>
        <ToolbarButton title="Rehacer (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo className="w-4 h-4"/></ToolbarButton>
      </div>
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="absolute text-sm text-gray-400 pointer-events-none top-2 left-3">{placeholder}</p>
        )}
        <EditorContent editor={editor}/>
      </div>
    </div>
  );
};