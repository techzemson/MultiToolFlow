import React, { useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';

export default function LineConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [delimiter, setDelimiter] = useState(';');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleConvert = () => {
    let lines = input.split('\n');
    
    if (trimSpaces) {
      lines = lines.map(line => line.trim()).filter(line => line.length > 0);
    } else {
      lines = lines.filter(line => line.length > 0);
    }

    if (removeDuplicates) {
      lines = [...new Set(lines)];
    }

    const finalDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
    setOutput(lines.join(finalDelimiter));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Line to Semicolon Converter</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Convert multiline text (like ASINs) to a single line separated by a delimiter.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[500px]">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Input (One item per line)</h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 resize-none"
            placeholder="B01N5IB20Q&#10;B01N5IB20R&#10;B01N5IB20S"
          />
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Lines: {input ? input.split('\n').length : 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[500px]">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Output</h2>
          <div className="relative flex-1">
            <textarea
              value={output}
              readOnly
              className="w-full h-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 resize-none"
              placeholder="Result will appear here..."
            />
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Items: {output ? output.split(delimiter === 'custom' ? customDelimiter : delimiter).length : 0}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delimiter</label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value=";">Semicolon (;)</option>
              <option value=",">Comma (,)</option>
              <option value=" ">Space ( )</option>
              <option value="custom">Custom...</option>
            </select>
            {delimiter === 'custom' && (
              <input
                type="text"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder="Enter custom delimiter"
                className="mt-2 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="remove-duplicates"
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => setRemoveDuplicates(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remove-duplicates" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Remove duplicates
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="trim-spaces"
                type="checkbox"
                checked={trimSpaces}
                onChange={(e) => setTrimSpaces(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="trim-spaces" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Trim spaces
              </label>
            </div>
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={handleConvert}
              disabled={!input}
              className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-medium rounded-md transition-colors shadow-sm w-full md:w-auto justify-center"
            >
              Convert <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
