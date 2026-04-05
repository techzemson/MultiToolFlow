import React, { useState, useRef } from 'react';
import { Copy, Check, Download, Upload, Trash2, FileText, Type, Hash, AlignLeft, HardDrive, Activity, Code, Wand2, Sparkles } from 'lucide-react';

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
      icon: Type,
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50 dark:bg-blue-900/20",
      btnHoverClass: "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-blue-500/10",
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
      icon: Code,
      colorClass: "text-indigo-600 dark:text-indigo-400",
      bgClass: "bg-indigo-50 dark:bg-indigo-900/20",
      btnHoverClass: "hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 hover:shadow-indigo-500/10",
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
      icon: Wand2,
      colorClass: "text-purple-600 dark:text-purple-400",
      bgClass: "bg-purple-50 dark:bg-purple-900/20",
      btnHoverClass: "hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 hover:shadow-purple-500/10",
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
      icon: Sparkles,
      colorClass: "text-pink-600 dark:text-pink-400",
      bgClass: "bg-pink-50 dark:bg-pink-900/20",
      btnHoverClass: "hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-700 dark:hover:text-pink-300 hover:shadow-pink-500/10",
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
    <div className="max-w-7xl mx-auto pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 text-center pt-8">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-5 shadow-sm">
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">Advanced Convert Case</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Transform your text with over 20+ advanced formatting, manipulation, and encoding tools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Stats (Sticky) */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[650px] ring-1 ring-black/5 dark:ring-white/5">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <Type className="w-4 h-4 mr-2 text-blue-500" />
                Your Text
              </span>
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
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all tooltip-trigger"
                  title="Upload File"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!text}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 transition-all"
                  title="Download as .txt"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  disabled={!text}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-all"
                  title="Clear Text"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
                <button
                  onClick={handleCopy}
                  disabled={!text}
                  className="flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
            </div>
            
            {/* Text Area */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 w-full p-6 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 resize-none font-mono text-[15px] leading-relaxed custom-scrollbar"
              placeholder="Type or paste your text here to get started..."
              spellCheck="false"
            />
            
            {/* Colored Stats Footer */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="flex flex-wrap gap-3 text-xs font-medium">
                <div className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 transition-transform hover:scale-105 cursor-default">
                  <Type className="w-4 h-4 mr-2 opacity-70" />
                  Words: <strong className="ml-1.5 text-blue-900 dark:text-blue-100 text-sm">{stats.wordCount}</strong>
                </div>
                <div className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 transition-transform hover:scale-105 cursor-default">
                  <Hash className="w-4 h-4 mr-2 opacity-70" />
                  Characters: <strong className="ml-1.5 text-indigo-900 dark:text-indigo-100 text-sm">{stats.charCount}</strong>
                </div>
                <div className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-400 transition-transform hover:scale-105 cursor-default">
                  <AlignLeft className="w-4 h-4 mr-2 opacity-70" />
                  Characters (no spaces): <strong className="ml-1.5 text-violet-900 dark:text-violet-100 text-sm">{stats.charNoSpaces}</strong>
                </div>
                <div className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-fuchsia-200 dark:border-fuchsia-800/50 text-fuchsia-700 dark:text-fuchsia-400 transition-transform hover:scale-105 cursor-default">
                  <Activity className="w-4 h-4 mr-2 opacity-70" />
                  Lines: <strong className="ml-1.5 text-fuchsia-900 dark:text-fuchsia-100 text-sm">{stats.lineCount}</strong>
                </div>
                <div className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 transition-transform hover:scale-105 cursor-default">
                  <HardDrive className="w-4 h-4 mr-2 opacity-70" />
                  Size: <strong className="ml-1.5 text-rose-900 dark:text-rose-100 text-sm">{stats.byteSize} B</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions (Scrollable naturally with page) */}
        <div className="lg:col-span-5 space-y-6">
          {BUTTON_GROUPS.map((group, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-5">
                <div className={`p-2.5 rounded-xl ${group.bgClass} ${group.colorClass}`}>
                  <group.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  {group.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {group.buttons.map((btn, bIdx) => (
                  <button
                    key={bIdx}
                    onClick={() => apply(btn.action)}
                    className={`px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${group.btnHoverClass}`}
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
