import React, { useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Code,
  FileText
} from 'lucide-react';

interface RichTextNoteProps {
  initialData?: string;
  onChange: (data: string) => void;
}

const RichTextNote: React.FC<RichTextNoteProps> = ({ initialData, onChange }) => {
  const [content, setContent] = useState(initialData || '');

  useEffect(() => {
    onChange(content);
  }, [content]);

  const applyFormat = (format: string, value?: string) => {
    document.execCommand(format, false, value);
    const editor = document.getElementById('rich-text-editor');
    if (editor) {
      setContent(editor.innerHTML);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setContent(e.currentTarget.innerHTML);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-slate-800/50 rounded-lg border border-indigo-500/20">
        <FileText className="w-5 h-5 text-indigo-400" />
        <span className="text-white font-semibold mr-4">Foglio di Testo</span>

        {/* Headings */}
        <button
          onClick={() => applyFormat('formatBlock', '<h1>')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Titolo 1"
        >
          <Heading1 className="w-5 h-5" />
        </button>
        <button
          onClick={() => applyFormat('formatBlock', '<h2>')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Titolo 2"
        >
          <Heading2 className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-slate-600 mx-1" />

        {/* Text Formatting */}
        <button
          onClick={() => applyFormat('bold')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Grassetto"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => applyFormat('italic')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Corsivo"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          onClick={() => applyFormat('underline')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Sottolineato"
        >
          <Underline className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-slate-600 mx-1" />

        {/* Lists */}
        <button
          onClick={() => applyFormat('insertUnorderedList')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Elenco puntato"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          onClick={() => applyFormat('insertOrderedList')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Elenco numerato"
        >
          <ListOrdered className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-slate-600 mx-1" />

        {/* Block Formatting */}
        <button
          onClick={() => applyFormat('formatBlock', '<blockquote>')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Citazione"
        >
          <Quote className="w-5 h-5" />
        </button>
        <button
          onClick={() => applyFormat('formatBlock', '<pre>')}
          className="p-2 hover:bg-slate-700 rounded text-gray-300 hover:text-white transition"
          title="Codice"
        >
          <Code className="w-5 h-5" />
        </button>
      </div>

      {/* Editor */}
      <div
        id="rich-text-editor"
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
        className="flex-1 p-4 bg-slate-900/50 rounded-lg border border-indigo-500/20 text-white focus:outline-none focus:border-indigo-500/50 overflow-auto prose prose-invert max-w-none"
        dir="ltr"
        style={{
          minHeight: '400px',
          lineHeight: '1.6',
          direction: 'ltr !important' as any,
          textAlign: 'left !important' as any,
          unicodeBidi: 'normal !important' as any,
          writingMode: 'horizontal-tb'
        }}
      />

      <style>{`
        #rich-text-editor {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: normal !important;
        }
        #rich-text-editor * {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: normal !important;
        }
        #rich-text-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
          color: #a5b4fc;
        }
        #rich-text-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
          color: #c7d2fe;
        }
        #rich-text-editor p {
          margin: 1em 0;
        }
        #rich-text-editor ul, #rich-text-editor ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        #rich-text-editor li {
          margin: 0.5em 0;
        }
        #rich-text-editor blockquote {
          border-left: 4px solid #6366f1;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #94a3b8;
        }
        #rich-text-editor pre {
          background: #1e293b;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          color: #22c55e;
        }
        #rich-text-editor code {
          background: #1e293b;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-family: 'Courier New', monospace;
          color: #22c55e;
        }
        #rich-text-editor b, #rich-text-editor strong {
          font-weight: bold;
        }
        #rich-text-editor i, #rich-text-editor em {
          font-style: italic;
        }
        #rich-text-editor u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default RichTextNote;
