import React, { useState, useMemo, useRef } from 'react';
import { Copy, Check, Download, Upload, Trash2, Settings2, ArrowRightLeft, FileText, ListFilter, Type, SortAsc } from 'lucide-react';

export default function LineConverter() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Options State ---
  // 1. Parsing
  const [splitBy, setSplitBy] = useState('newline');
  const [customSplit, setCustomSplit] = useState('');
  const [extractMode, setExtractMode] = useState('none');

  // 2. Cleaning
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [removeSpecialChars, setRemoveSpecialChars] = useState(false);

  // 3. Transformations
  const [caseConversion, setCaseConversion] = useState('none');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // 4. Sorting
  const [sortMode, setSortMode] = useState('none');
  const [reverseOrder, setReverseOrder] = useState(false);

  // 5. Formatting
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [wrapMode, setWrapMode] = useState('none');
  const [customWrapOpen, setCustomWrapOpen] = useState('');
  const [customWrapClose, setCustomWrapClose] = useState('');
  const [numberItems, setNumberItems] = useState(false);

  // 6. Output
  const [joinBy, setJoinBy] = useState('semicolon');
  const [customJoin, setCustomJoin] = useState('');
  const [chunkSize, setChunkSize] = useState<string>('');

  // --- Logic ---
  const output = useMemo(() => {
    if (!input) return '';

    // 1. Parsing
    let items: string[] = [];
    if (extractMode === 'emails') {
      items = input.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
    } else if (extractMode === 'urls') {
      items = input.match(/(https?:\/\/[^\s]+)/gi) || [];
    } else if (extractMode === 'numbers') {
      items = input.match(/\b\d+\b/g) || [];
    } else {
      let splitChar = '\n';
      if (splitBy === 'comma') splitChar = ',';
      else if (splitBy === 'semicolon') splitChar = ';';
      else if (splitBy === 'pipe') splitChar = '|';
      else if (splitBy === 'space') splitChar = ' ';
      else if (splitBy === 'custom') splitChar = customSplit;
      
      items = input.split(splitChar);
    }

    // 2. Cleaning
    if (trimWhitespace) items = items.map(i => i.trim());
    if (removeEmpty) items = items.filter(i => i.length > 0);
    if (removeSpecialChars) items = items.map(i => i.replace(/[^\w\s]/gi, ''));
    if (removeDuplicates) items = [...new Set(items)];

    // 3. Transformations
    if (caseConversion === 'lower') items = items.map(i => i.toLowerCase());
    else if (caseConversion === 'upper') items = items.map(i => i.toUpperCase());
    else if (caseConversion === 'title') items = items.map(i => i.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()));

    if (findText) items = items.map(i => i.split(findText).join(replaceText));

    // 4. Sorting
    if (sortMode === 'az') items.sort((a, b) => a.localeCompare(b));
    else if (sortMode === 'za') items.sort((a, b) => b.localeCompare(a));
    else if (sortMode === 'lengthAsc') items.sort((a, b) => a.length - b.length);
    else if (sortMode === 'lengthDesc') items.sort((a, b) => b.length - a.length);

    if (reverseOrder) items.reverse();

    // 5. Formatting
    items = items.map((item, index) => {
      let formatted = item;
      if (wrapMode === 'single') formatted = `'${formatted}'`;
      else if (wrapMode === 'double') formatted = `"${formatted}"`;
      else if (wrapMode === 'parentheses') formatted = `(${formatted})`;
      else if (wrapMode === 'brackets') formatted = `[${formatted}]`;
      else if (wrapMode === 'braces') formatted = `{${formatted}}`;
      else if (wrapMode === 'custom') formatted = `${customWrapOpen}${formatted}${customWrapClose}`;
      
      formatted = `${prefix}${formatted}${suffix}`;
      
      if (numberItems) formatted = `${index + 1}. ${formatted}`;
      return formatted;
    });

    // 6. Joining
    let joinChar = ';';
    if (joinBy === 'comma') joinChar = ',';
    else if (joinBy === 'pipe') joinChar = '|';
    else if (joinBy === 'space') joinChar = ' ';
    else if (joinBy === 'newline') joinChar = '\n';
    else if (joinBy === 'custom') joinChar = customJoin;

    if (chunkSize && Number(chunkSize) > 0) {
      const chunks = [];
      const size = Number(chunkSize);
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size).join(joinChar));
      }
      return chunks.join('\n');
    }

    return items.join(joinChar);
  }, [
    input, splitBy, customSplit, extractMode, trimWhitespace, removeEmpty, removeDuplicates, removeSpecialChars,
    caseConversion, findText, replaceText, sortMode, reverseOrder, prefix, suffix, wrapMode, customWrapOpen,
    customWrapClose, numberItems, joinBy, customJoin, chunkSize
  ]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInput(event.target.result as string);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const inputItemCount = input ? input.split(splitBy === 'newline' ? '\n' : splitBy === 'comma' ? ',' : splitBy === 'semicolon' ? ';' : splitBy === 'space' ? ' ' : customSplit || '\n').filter(i => i.trim()).length : 0;
  const outputItemCount = output ? output.split(joinBy === 'newline' ? '\n' : joinBy === 'comma' ? ',' : joinBy === 'semicolon' ? ';' : joinBy === 'space' ? ' ' : customJoin || ';').filter(i => i.trim()).length : 0;

  return (
    <div className="max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-center pt-6">
        <div className="inline-flex items-center justify-center p-3.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-5 shadow-sm">
          <ArrowRightLeft className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">Advanced List Converter</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          Transform, clean, sort, and format massive lists (100,000+ lines) with over 20+ advanced real-time features.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-auto xl:h-[800px]">
        {/* Sidebar: Options */}
        <div className="w-full xl:w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden h-[600px] xl:h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center">
            <Settings2 className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-sm">Conversion Settings</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
            
            {/* PRIMARY: Output Generation */}
            <section className="space-y-3 bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800/50 shadow-sm">
              <h3 className="text-sm font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center mb-3">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Join Output By
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'semicolon', label: 'Semicolon (;)' },
                  { id: 'comma', label: 'Comma (,)' },
                  { id: 'pipe', label: 'Pipe (|)' },
                  { id: 'space', label: 'Space ( )' },
                  { id: 'newline', label: 'New Line (\\n)' },
                  { id: 'custom', label: 'Custom...' },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setJoinBy(option.id)}
                    className={`px-2 py-2 text-xs font-bold rounded-lg border transition-all ${
                      joinBy === option.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {joinBy === 'custom' && (
                <input type="text" value={customJoin} onChange={(e) => setCustomJoin(e.target.value)} placeholder="Custom delimiter" className="mt-2 w-full text-sm rounded-lg border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
              )}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Chunk Size (Line breaks after X items)</label>
                <input type="number" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} placeholder="e.g. 10 (Optional)" min="1" className="w-full text-sm rounded-lg border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </section>

            {/* 1. Input Parsing */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center">
                <ListFilter className="w-3.5 h-3.5 mr-1.5" /> Input Parsing
              </h3>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Split Input By</label>
                <select value={splitBy} onChange={(e) => setSplitBy(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="newline">New Line (\n)</option>
                  <option value="comma">Comma (,)</option>
                  <option value="semicolon">Semicolon (;)</option>
                  <option value="pipe">Pipe (|)</option>
                  <option value="space">Space ( )</option>
                  <option value="custom">Custom...</option>
                </select>
                {splitBy === 'custom' && (
                  <input type="text" value={customSplit} onChange={(e) => setCustomSplit(e.target.value)} placeholder="Custom delimiter" className="mt-2 w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Smart Extract</label>
                <select value={extractMode} onChange={(e) => setExtractMode(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="none">Disabled</option>
                  <option value="emails">Extract Emails</option>
                  <option value="urls">Extract URLs</option>
                  <option value="numbers">Extract Numbers</option>
                </select>
              </div>
            </section>

            {/* 2. Cleaning */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Cleaning
              </h3>
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-emerald-600 transition-colors">
                  <input type="checkbox" checked={trimWhitespace} onChange={(e) => setTrimWhitespace(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2" />
                  Trim Whitespace
                </label>
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-emerald-600 transition-colors">
                  <input type="checkbox" checked={removeEmpty} onChange={(e) => setRemoveEmpty(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2" />
                  Remove Empty Items
                </label>
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-emerald-600 transition-colors">
                  <input type="checkbox" checked={removeDuplicates} onChange={(e) => setRemoveDuplicates(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2" />
                  Remove Duplicates
                </label>
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-emerald-600 transition-colors">
                  <input type="checkbox" checked={removeSpecialChars} onChange={(e) => setRemoveSpecialChars(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2" />
                  Remove Special Chars
                </label>
              </div>
            </section>

            {/* 3. Sorting */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center">
                <SortAsc className="w-3.5 h-3.5 mr-1.5" /> Sorting
              </h3>
              <div>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500">
                  <option value="none">Original Order</option>
                  <option value="az">Alphabetical (A-Z)</option>
                  <option value="za">Alphabetical (Z-A)</option>
                  <option value="lengthAsc">Length (Short to Long)</option>
                  <option value="lengthDesc">Length (Long to Short)</option>
                </select>
              </div>
              <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-amber-600 transition-colors">
                <input type="checkbox" checked={reverseOrder} onChange={(e) => setReverseOrder(e.target.checked)} className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2" />
                Reverse List Order
              </label>
            </section>

            {/* 4. Formatting */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center">
                <Type className="w-3.5 h-3.5 mr-1.5" /> Formatting
              </h3>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Case Conversion</label>
                <select value={caseConversion} onChange={(e) => setCaseConversion(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-pink-500 focus:border-pink-500">
                  <option value="none">Original Case</option>
                  <option value="lower">lowercase</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="title">Title Case</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Wrap Items In</label>
                <select value={wrapMode} onChange={(e) => setWrapMode(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-pink-500 focus:border-pink-500">
                  <option value="none">None</option>
                  <option value="single">Single Quotes ('item')</option>
                  <option value="double">Double Quotes ("item")</option>
                  <option value="parentheses">Parentheses ((item))</option>
                  <option value="brackets">Brackets ([item])</option>
                  <option value="braces">Braces (&#123;item&#125;)</option>
                  <option value="custom">Custom...</option>
                </select>
                {wrapMode === 'custom' && (
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={customWrapOpen} onChange={(e) => setCustomWrapOpen(e.target.value)} placeholder="Open" className="w-1/2 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    <input type="text" value={customWrapClose} onChange={(e) => setCustomWrapClose(e.target.value)} placeholder="Close" className="w-1/2 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Prefix</label>
                  <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Suffix</label>
                  <input type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)} className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
              </div>
              <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-pink-600 transition-colors">
                <input type="checkbox" checked={numberItems} onChange={(e) => setNumberItems(e.target.checked)} className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 mr-2" />
                Number Items (1., 2., etc.)
              </label>
            </section>

            {/* 5. Find & Replace */}
            <section className="space-y-3 pb-4">
              <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Find & Replace
              </h3>
              <div className="flex gap-2">
                <input type="text" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Find..." className="w-1/2 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace..." className="w-1/2 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
            </section>



          </div>
        </div>

        {/* Main Content: Input & Output */}
        <div className="flex-1 flex flex-col gap-6 h-[800px] xl:h-full">
          
          {/* INPUT SECTION (Blue Theme) */}
          <div className="flex-1 bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border-2 border-blue-200 dark:border-blue-800/50 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center px-5 py-3 border-b border-blue-200 dark:border-blue-800/50 bg-blue-100/50 dark:bg-blue-900/30">
              <span className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center">
                <FileText className="w-4 h-4 mr-2" /> Input
              </span>
              <div className="flex space-x-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv,.md" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-blue-600 hover:bg-blue-200 dark:text-blue-400 dark:hover:bg-blue-800/50 rounded-lg transition-colors" title="Upload File">
                  <Upload className="w-4 h-4" />
                </button>
                <button onClick={() => setInput('')} disabled={!input} className="p-1.5 text-blue-600 hover:bg-blue-200 dark:text-blue-400 dark:hover:bg-blue-800/50 rounded-lg disabled:opacity-50 transition-colors" title="Clear Input">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 w-full p-5 bg-transparent border-none focus:ring-0 text-blue-900 dark:text-blue-100 resize-none font-mono text-sm leading-relaxed custom-scrollbar placeholder-blue-300 dark:placeholder-blue-700"
              placeholder="Paste your raw list here... (Supports 100,000+ lines)"
              spellCheck="false"
            />
            <div className="px-5 py-2.5 border-t border-blue-200 dark:border-blue-800/50 bg-blue-100/30 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-400">
              Detected Items: <strong className="text-blue-900 dark:text-blue-200">{inputItemCount}</strong>
            </div>
          </div>

          {/* OUTPUT SECTION (Emerald Theme) */}
          <div className="flex-1 bg-emerald-50/40 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/50 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center px-5 py-3 border-b border-emerald-200 dark:border-emerald-800/50 bg-emerald-100/50 dark:bg-emerald-900/30">
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center">
                <Check className="w-4 h-4 mr-2" /> Output
              </span>
              <div className="flex space-x-2">
                <button onClick={handleDownload} disabled={!output} className="p-1.5 text-emerald-600 hover:bg-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-800/50 rounded-lg disabled:opacity-50 transition-colors" title="Download Output">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={handleCopy} disabled={!output} className="flex items-center px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all shadow-sm active:scale-95">
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              className="flex-1 w-full p-5 bg-transparent border-none focus:ring-0 text-emerald-900 dark:text-emerald-100 resize-none font-mono text-sm leading-relaxed custom-scrollbar placeholder-emerald-300 dark:placeholder-emerald-700"
              placeholder="Converted result will appear here instantly..."
              spellCheck="false"
            />
            <div className="px-5 py-2.5 border-t border-emerald-200 dark:border-emerald-800/50 bg-emerald-100/30 dark:bg-emerald-900/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Final Items: <strong className="text-emerald-900 dark:text-emerald-200">{outputItemCount}</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
