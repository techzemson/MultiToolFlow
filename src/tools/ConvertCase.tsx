import React, { useState, useRef } from 'react';
import { Copy, Check, Download, Upload, Trash2, FileText } from 'lucide-react';

export default function ConvertCase() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => setText('');

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setText(event.target.result as string);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const apply = (fn: (t: string) => string) => {
    if (!text) return;
    setText(fn(text));
  };

  // --- Standard Case ---
  const toUpperCase = (t: string) => t.toUpperCase();
  const toLowerCase = (t: string) => t.toLowerCase();
  const toTitleCase = (t: string) => {
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of'];
    return t.toLowerCase().split(' ').map((word, index) => {
      if (index === 0 || !minorWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  };
  const toCapitalizedCase = (t: string) => t.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  const toSentenceCase = (t: string) => t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
  const toAlternatingCase = (t: string) => t.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
  const toInverseCase = (t: string) => t.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('');
  const toSwapCase = (t: string) => t.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');

  // --- Programming Case ---
  const toCamelCase = (t: string) => t.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, c => c.toLowerCase());
  const toPascalCase = (t: string) => t.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, c => c.toUpperCase());
  const toSnakeCase = (t: string) => t.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
  const toKebabCase = (t: string) => t.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase();
  const toConstantCase = (t: string) => t.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toUpperCase();
  const toDotCase = (t: string) => t.replace(/([a-z])([A-Z])/g, '$1.$2').replace(/[-_\s]+/g, '.').toLowerCase();
  const toPathCase = (t: string) => t.replace(/([a-z])([A-Z])/g, '$1/$2').replace(/[-_\s]+/g, '/').toLowerCase();

  // --- Text Manipulation ---
  const reverseText = (t: string) => t.split('').reverse().join('');
  const reverseWords = (t: string) => t.split(' ').reverse().join(' ');
  const removeExtraSpaces = (t: string) => t.replace(/\s+/g, ' ').trim();
  const stripWhitespace = (t: string) => t.replace(/\s+/g, '');
  const removeVowels = (t: string) => t.replace(/[aeiouAEIOU]/g, '');
  const removeConsonants = (t: string) => t.replace(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g, '');
  const removeNumbers = (t: string) => t.replace(/\d/g, '');
  const removeSpecialChars = (t: string) => t.replace(/[^\w\s]/gi, '');

  // --- Encoding & Fun ---
  const base64Encode = (t: string) => { try { return btoa(unescape(encodeURIComponent(t))); } catch(e) { return "Error: Invalid characters for Base64"; } };
  const base64Decode = (t: string) => { try { return decodeURIComponent(escape(atob(t))); } catch(e) { return "Error: Invalid Base64 string"; } };
  const urlEncode = (t: string) => encodeURIComponent(t);
  const urlDecode = (t: string) => { try { return decodeURIComponent(t); } catch(e) { return "Error: Invalid URL encoding"; } };
  const toLeetSpeak = (t: string) => {
    const leetMap: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', l: '1' };
    return t.replace(/[aeioslt]/gi, m => leetMap[m.toLowerCase()] || m);
  };
  const toRot13 = (t: string) => t.replace(/[a-zA-Z]/g, c => {
    const code = c.charCodeAt(0);
    const limit = code <= 90 ? 90 : 122;
    const shifted = code + 13;
    return String.fromCharCode(shifted > limit ? shifted - 26 : shifted);
  });

  const BUTTON_GROUPS = [
    {
      title: "Standard Case",
      buttons: [
        { label: "UPPERCASE", action: toUpperCase },
        { label: "lowercase", action: toLowerCase },
        { label: "Title Case", action: toTitleCase },
        { label: "Sentence case", action: toSentenceCase },
        { label: "Capitalized Case", action: toCapitalizedCase },
        { label: "aLtErNaTiNg cAsE", action: toAlternatingCase },
        { label: "InVeRsE CaSe", action: toInverseCase },
        { label: "Swap Case", action: toSwapCase },
      ]
    },
    {
      title: "Programming Case",
      buttons: [
        { label: "camelCase", action: toCamelCase },
        { label: "PascalCase", action: toPascalCase },
        { label: "snake_case", action: toSnakeCase },
        { label: "kebab-case", action: toKebabCase },
        { label: "CONSTANT_CASE", action: toConstantCase },
        { label: "dot.case", action: toDotCase },
        { label: "path/case", action: toPathCase },
      ]
    },
    {
      title: "Text Manipulation",
      buttons: [
        { label: "Reverse Text", action: reverseText },
        { label: "Reverse Words", action: reverseWords },
        { label: "Remove Extra Spaces", action: removeExtraSpaces },
        { label: "Strip Whitespace", action: stripWhitespace },
        { label: "Remove Vowels", action: removeVowels },
        { label: "Remove Consonants", action: removeConsonants },
        { label: "Remove Numbers", action: removeNumbers },
        { label: "Remove Special Chars", action: removeSpecialChars },
      ]
    },
    {
      title: "Encoding & Fun",
      buttons: [
        { label: "Base64 Encode", action: base64Encode },
        { label: "Base64 Decode", action: base64Decode },
        { label: "URL Encode", action: urlEncode },
        { label: "URL Decode", action: urlDecode },
        { label: "Leetspeak", action: toLeetSpeak },
        { label: "ROT13", action: toRot13 },
      ]
    }
  ];

  const getStats = () => {
    const charCount = text.length;
    const charNoSpaces = text.replace(/\s/g, '').length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text ? text.split(/\r\n|\r|\n/).length : 0;
    const byteSize = new Blob([text]).size;
    return { charCount, charNoSpaces, wordCount, lineCount, byteSize };
  };

  const stats = getStats();

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Advanced Convert Case</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Transform your text with over 20+ advanced formatting, manipulation, and encoding tools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input and Stats */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[600px]">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Text</span>
              <div className="flex space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv,.json,.md"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors tooltip-trigger"
                  title="Upload File"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!text}
                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
                  title="Download as .txt"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  disabled={!text}
                  className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                  title="Clear Text"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!text}
                  className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 w-full p-4 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 resize-none font-mono text-sm leading-relaxed"
              placeholder="Type or paste your text here to get started..."
              spellCheck="false"
            />
            
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Words: <strong className="text-gray-900 dark:text-gray-200">{stats.wordCount}</strong></span>
                <span>Characters: <strong className="text-gray-900 dark:text-gray-200">{stats.charCount}</strong></span>
                <span>Chars (no spaces): <strong className="text-gray-900 dark:text-gray-200">{stats.charNoSpaces}</strong></span>
                <span>Lines: <strong className="text-gray-900 dark:text-gray-200">{stats.lineCount}</strong></span>
                <span>Size: <strong className="text-gray-900 dark:text-gray-200">{stats.byteSize} bytes</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-5 space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {BUTTON_GROUPS.map((group, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                {group.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.buttons.map((btn, bIdx) => (
                  <button
                    key={bIdx}
                    onClick={() => apply(btn.action)}
                    className="px-3 py-2 bg-gray-100 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 active:scale-95"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
