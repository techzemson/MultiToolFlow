import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Download, Copy, MessageSquare, AlertTriangle, 
  CheckCircle, Search, PieChart, ShieldAlert, FileJson, FileCode2, 
  Bot, ChevronRight, File, Loader2, Send, X, RefreshCw, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenAI } from '@google/genai';

// Configure PDF.js worker using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface AnalysisResult {
  classification: string;
  summary: string;
  sentiment: string;
  readabilityScore: string;
  keyEntities: string[];
  actionItems: string[];
  redFlags: string[];
  piiDetected: string[];
  targetAudience: string;
  mainArguments: string[];
  statisticalData: string[];
  legalClauses: string[];
  financialFigures: string[];
  datesAndDeadlines: string[];
  contactInfo: string[];
  documentLanguage: string;
  technicalTerms: string[];
  biasDetection: string;
  suggestedQuestions: string[];
  documentOutline: string[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function PdfScannerApp() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'risks' | 'chat' | 'raw'>('overview');
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile || droppedFile.type !== 'application/pdf') {
      alert('Please drop a valid PDF file.');
      return;
    }
    processFile(droppedFile);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setPdfUrl(URL.createObjectURL(selectedFile));
    setIsProcessing(true);
    setAnalysis(null);
    setChatHistory([]);
    setActiveTab('overview');

    try {
      setProgressText('Extracting text from PDF...');
      const text = await extractTextFromPdf(selectedFile);
      setExtractedText(text);
      
      // Calculate basic stats
      const words = text.trim().split(/\s+/).length;
      setWordCount(words);
      setCharCount(text.length);

      setProgressText('AI is analyzing document structure and content...');
      await analyzeTextWithAI(text);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText;
  };

  const analyzeTextWithAI = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Truncate text if it's too massive, though Gemini 3.1 Pro handles large contexts well
      const truncatedText = text.substring(0, 100000); 
      
      const prompt = `
        Analyze the following text extracted from a PDF document. 
        Return ONLY a valid JSON object with the exact following structure, no markdown formatting, no backticks:
        {
          "classification": "Document Type (e.g., Invoice, Legal Contract, Research Paper, Resume)",
          "summary": "A concise 2-3 paragraph executive summary of the document.",
          "sentiment": "Overall tone (e.g., Formal, Positive, Neutral, Urgent)",
          "readabilityScore": "Estimated reading level or complexity",
          "keyEntities": ["Entity 1", "Entity 2", "Entity 3"],
          "actionItems": ["Action 1", "Action 2"],
          "redFlags": ["Potential risk 1", "Missing information", "Concerning clause"],
          "piiDetected": ["Type of PII found (e.g., Email, Phone, SSN) or 'None detected'"],
          "targetAudience": "Intended audience for this document",
          "mainArguments": ["Argument 1", "Argument 2"],
          "statisticalData": ["Statistic 1", "Statistic 2"],
          "legalClauses": ["Clause 1", "Clause 2"],
          "financialFigures": ["Figure 1", "Figure 2"],
          "datesAndDeadlines": ["Date 1", "Date 2"],
          "contactInfo": ["Contact 1", "Contact 2"],
          "documentLanguage": "Primary language",
          "technicalTerms": ["Term 1", "Term 2"],
          "biasDetection": "Any detected bias or 'None detected'",
          "suggestedQuestions": ["Question 1", "Question 2"],
          "documentOutline": ["Section 1", "Section 2"]
        }
        
        Document Text:
        ${truncatedText}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      let jsonStr = response.text || '{}';
      // Clean up potential markdown formatting from the response
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const result = JSON.parse(jsonStr) as AnalysisResult;
      setAnalysis(result);
      
      // Initialize chat history with a greeting
      setChatHistory([
        { role: 'ai', content: `Hello! I've analyzed the ${result.classification}. What would you like to know about it?` }
      ]);

    } catch (error) {
      console.error('AI Analysis failed:', error);
      // Fallback if AI fails
      setAnalysis({
        classification: 'Unknown Document',
        summary: 'Failed to generate AI summary. The document might be too large or complex.',
        sentiment: 'Unknown',
        readabilityScore: 'Unknown',
        keyEntities: [],
        actionItems: [],
        redFlags: [],
        piiDetected: [],
        targetAudience: 'Unknown',
        mainArguments: [],
        statisticalData: [],
        legalClauses: [],
        financialFigures: [],
        datesAndDeadlines: [],
        contactInfo: [],
        documentLanguage: 'Unknown',
        technicalTerms: [],
        biasDetection: 'Unknown',
        suggestedQuestions: [],
        documentOutline: []
      });
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !extractedText) return;
    
    const newUserMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const historyText = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      
      const prompt = `
        You are an intelligent document assistant. Use the following document text to answer the user's question.
        If the answer is not in the document, say so. Be helpful and concise.
        
        Document Text:
        ${extractedText.substring(0, 50000)}
        
        Chat History:
        ${historyText}
        User: ${newUserMsg.content}
        Assistant:
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      setChatHistory(prev => [...prev, { role: 'ai', content: response.text || 'Sorry, I could not generate a response.' }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Error communicating with AI. Please try again.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'json' | 'md') => {
    let content = '';
    let mimeType = '';
    let extension = format;

    if (format === 'txt') {
      content = extractedText;
      mimeType = 'text/plain';
    } else if (format === 'json') {
      content = JSON.stringify({
        metadata: { wordCount, charCount, fileName: file?.name },
        analysis,
        rawText: extractedText
      }, null, 2);
      mimeType = 'application/json';
    } else if (format === 'md') {
      content = `# Document Analysis: ${file?.name}\n\n`;
      content += `## Classification\n${analysis?.classification}\n\n`;
      content += `## Summary\n${analysis?.summary}\n\n`;
      content += `## Key Entities\n${analysis?.keyEntities.map(e => `- ${e}`).join('\n')}\n\n`;
      content += `## Action Items\n${analysis?.actionItems.map(a => `- ${a}`).join('\n')}\n\n`;
      content += `## Red Flags & Risks\n${analysis?.redFlags.map(r => `- ${r}`).join('\n')}\n\n`;
      content += `## Raw Text\n\n${extractedText}`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_result.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    setFile(null);
    setPdfUrl(null);
    setExtractedText('');
    setAnalysis(null);
    setChatHistory([]);
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 pt-6 flex justify-between items-end">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI PDF Scanner</h1>
            <p className="text-gray-600 dark:text-gray-400">Extract, analyze, and chat with any PDF document.</p>
          </div>
        </div>
        {file && (
          <button onClick={resetApp} className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" /> Scan Another PDF
          </button>
        )}
      </div>

      {!file && !isProcessing && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors group relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input type="file" accept="application/pdf" multiple onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="bg-blue-50 dark:bg-blue-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Drag & Drop your PDFs here</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Upload up to 10+ PDF documents (even &gt;50MB) to instantly extract text and generate AI-powered insights.</p>
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20">
            Browse Files
          </button>
          
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-4xl mx-auto border-t border-gray-100 dark:border-gray-700 pt-8">
            {[
              { icon: Bot, title: 'AI Summary', desc: 'Instant executive summaries' },
              { icon: ShieldAlert, title: 'Risk Detection', desc: 'Identify red flags & PII' },
              { icon: MessageSquare, title: 'Chat with PDF', desc: 'Ask questions directly' },
              { icon: FileJson, title: 'Export Data', desc: 'Download as JSON/TXT/MD' }
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <feature.icon className="w-6 h-6 text-gray-400 mb-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{feature.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <Bot className="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analyzing Document</h2>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">{progressText}</p>
        </div>
      )}

      {file && !isProcessing && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[800px]">
          
          {/* Left Panel: PDF Preview */}
          <div className="lg:col-span-5 bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-800 flex flex-col">
            <div className="bg-gray-800 px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <div className="flex items-center text-gray-300 text-sm font-medium truncate">
                <File className="w-4 h-4 mr-2 text-blue-400" />
                <span className="truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex space-x-2">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{wordCount.toLocaleString()} words</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
            <div className="flex-1 w-full bg-gray-100">
              {pdfUrl && <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-0" title="PDF Preview" />}
            </div>
          </div>

          {/* Right Panel: Analysis & Tools */}
          <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            
            {/* Tabs */}
            <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {[
                { id: 'overview', label: 'AI Overview', icon: PieChart },
                { id: 'entities', label: 'Entities & Data', icon: Search },
                { id: 'risks', label: 'Risks & Flags', icon: ShieldAlert },
                { id: 'chat', label: 'Chat with PDF', icon: MessageSquare },
                { id: 'raw', label: 'Raw Text', icon: FileText },
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                  
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold">
                          <FileText className="w-4 h-4 mr-2" /> {analysis.classification}
                        </div>
                        <div className="flex space-x-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
                            Sentiment: {analysis.sentiment}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
                            Readability: {analysis.readabilityScore}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                          <Bot className="w-5 h-5 mr-2 text-blue-500" /> Executive Summary
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Target Audience</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.targetAudience}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Document Language</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.documentLanguage}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Bias Detection</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.biasDetection}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Main Arguments</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                            {analysis.mainArguments.map((arg, i) => <li key={i}>{arg}</li>)}
                          </ul>
                        </div>
                      </div>

                      {analysis.actionItems.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" /> Action Items
                          </h3>
                          <ul className="space-y-2">
                            {analysis.actionItems.map((item, i) => (
                              <li key={i} className="flex items-start bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                <div className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xs font-bold mr-3 mt-0.5 shrink-0">{i+1}</div>
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Entities Tab */}
                  {activeTab === 'entities' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Key Entities</h3>
                        <div className="flex flex-wrap gap-2">
                          {analysis.keyEntities.map((entity, i) => (
                            <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-sm font-medium">
                              {entity}
                            </span>
                          ))}
                          {analysis.keyEntities.length === 0 && <p className="text-gray-500 text-sm">No key entities detected.</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Statistical Data</h3>
                          <ul className="space-y-1">
                            {analysis.statisticalData.map((data, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start"><span className="mr-2">•</span>{data}</li>)}
                            {analysis.statisticalData.length === 0 && <li className="text-sm text-gray-500">None found.</li>}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Financial Figures</h3>
                          <ul className="space-y-1">
                            {analysis.financialFigures.map((fig, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start"><span className="mr-2">•</span>{fig}</li>)}
                            {analysis.financialFigures.length === 0 && <li className="text-sm text-gray-500">None found.</li>}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Dates & Deadlines</h3>
                          <ul className="space-y-1">
                            {analysis.datesAndDeadlines.map((date, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start"><span className="mr-2">•</span>{date}</li>)}
                            {analysis.datesAndDeadlines.length === 0 && <li className="text-sm text-gray-500">None found.</li>}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Contact Info</h3>
                          <ul className="space-y-1">
                            {analysis.contactInfo.map((info, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start"><span className="mr-2">•</span>{info}</li>)}
                            {analysis.contactInfo.length === 0 && <li className="text-sm text-gray-500">None found.</li>}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Technical Terms</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysis.technicalTerms.map((term, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">{term}</span>
                            ))}
                            {analysis.technicalTerms.length === 0 && <span className="text-sm text-gray-500">None found.</span>}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-md font-bold text-gray-900 dark:text-white mb-3">Legal Clauses</h3>
                          <ul className="space-y-1">
                            {analysis.legalClauses.map((clause, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start"><span className="mr-2">•</span>{clause}</li>)}
                            {analysis.legalClauses.length === 0 && <li className="text-sm text-gray-500">None found.</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risks Tab */}
                  {activeTab === 'risks' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" /> Red Flags & Risks
                        </h3>
                        {analysis.redFlags.length > 0 ? (
                          <ul className="space-y-2">
                            {analysis.redFlags.map((flag, i) => (
                              <li key={i} className="flex items-start bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 mr-3 mt-0.5 shrink-0" />
                                <span className="text-gray-800 dark:text-gray-200 text-sm">{flag}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-900/30 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2" /> No major red flags detected by AI.
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                          <ShieldAlert className="w-5 h-5 mr-2 text-red-500" /> PII / Sensitive Data
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {analysis.piiDetected.map((pii, i) => (
                            <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${pii.toLowerCase().includes('none') ? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50'}`}>
                              {pii}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chat Tab */}
                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                        {chatHistory.length === 1 && analysis.suggestedQuestions.length > 0 && (
                          <div className="mb-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Suggested questions:</p>
                            <div className="flex flex-wrap gap-2">
                              {analysis.suggestedQuestions.map((q, i) => (
                                <button 
                                  key={i}
                                  onClick={() => {
                                    setChatInput(q);
                                    // Small delay to allow state update before sending
                                    setTimeout(() => handleSendMessage(), 50);
                                  }}
                                  className="text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm transition-colors border border-blue-100 dark:border-blue-800/50"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'}`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex space-x-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask anything about this document..."
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={isChatting || !chatInput.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Raw Text Tab */}
                  {activeTab === 'raw' && (
                    <div className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Raw Extracted Text</h3>
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 overflow-y-auto custom-scrollbar">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">{extractedText}</pre>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
