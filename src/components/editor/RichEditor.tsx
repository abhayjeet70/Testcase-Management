import React, { useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, 
  Code, Link, Undo, Redo, Trash2, ListChecks 
} from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder = 'Add test steps details...' }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync value from parent once on load or when it diverges
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<ol><li></li></ol>';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, valueStr: string = '') => {
    document.execCommand(command, false, valueStr);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const toggleChecklist = () => {
    // Implement custom checklist block or toggle list item
    execCommand('insertUnorderedList');
    // We can add a class or attribute if we want to style it, but a checklist is easily rendered.
  };

  return (
    <div className="border border-[#E7D6C4] rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-[#8B5A2B] focus-within:ring-offset-1 transition-all duration-200">
      {/* TOOLBAR */}
      <div className="bg-[#FFF4E8] px-3 py-1.5 border-b border-[#E7D6C4] flex flex-wrap gap-1 items-center">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        
        <span className="h-4 w-[1px] bg-[#E7D6C4] mx-1" />

        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleChecklist}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Checklist Item"
        >
          <ListChecks className="w-4 h-4" />
        </button>

        <span className="h-4 w-[1px] bg-[#E7D6C4] mx-1" />

        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<code>')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter link URL:');
            if (url) execCommand('createLink', url);
          }}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Add Link"
        >
          <Link className="w-4 h-4" />
        </button>

        <span className="h-4 w-[1px] bg-[#E7D6C4] mx-1" />

        <button
          type="button"
          onClick={() => execCommand('undo')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors ml-auto"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('redo')}
          className="p-1.5 hover:bg-[#E7D6C4] rounded text-[#3B2A1D] transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to clear the editor content?')) {
              if (editorRef.current) {
                editorRef.current.innerHTML = '<ol><li></li></ol>';
                onChange('<ol><li></li></ol>');
              }
            }
          }}
          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition-colors"
          title="Clear Content"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* EDITABLE FIELD */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 min-h-[180px] max-h-[360px] overflow-y-auto focus:outline-hidden text-[#3B2A1D] leading-relaxed select-text prose prose-amber font-sans text-sm"
        style={{
          outline: 'none',
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
