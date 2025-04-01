import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, ListOrdered, List as ListBullet } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-form-border-300 rounded-lg bg-white overflow-hidden">
      <div className="border-b border-form-border-200 bg-form-bg-50 p-2 flex gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded ${editor.isActive('underline') ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-form-border-200 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-form-border-200 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Bullet List"
        >
          <ListBullet className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-form-bg-200' : 'hover:bg-form-bg-100'}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}