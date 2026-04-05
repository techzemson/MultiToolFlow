import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Save, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface CampaignData {
  campaign: string;
  spend: number;
  sales: number;
  impressions: number;
  clicks: number;
  acos: number;
  ctr: number;
  cpc: number;
}

interface ReportData {
  summary: {
    totalSpend: number;
    totalSales: number;
    overallAcos: number;
    totalImpressions: number;
    totalClicks: number;
    overallCtr: number;
    overallCpc: number;
  };
  campaigns: CampaignData[];
  insights: string;
  fileUrl?: string | null;
}

export default function AmazonPPC() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a valid Excel (.xlsx) or CSV file.');
        setFile(null);
      }
    }
  };

  const processData = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error('The uploaded file is empty.');
      }

      // Try to find correct column names (Amazon reports can vary)
      const firstRow = jsonData[0];
      const getCol = (possibleNames: string[]) => {
        const key = Object.keys(firstRow).find(k => possibleNames.some(p => k.toLowerCase().includes(p)));
        return key || possibleNames[0];
      };

      const colCampaign = getCol(['campaign', 'campaign name']);
      const colSpend = getCol(['spend']);
      const colSales = getCol(['sales', '7 day total sales']);
      const colImpressions = getCol(['impressions']);
      const colClicks = getCol(['clicks']);

      let totalSpend = 0;
      let totalSales = 0;
      let totalImpressions = 0;
      let totalClicks = 0;

      const campaignMap = new Map<string, CampaignData>();

      jsonData.forEach(row => {
        const campaign = row[colCampaign] || 'Unknown';
        const spend = parseFloat(row[colSpend]) || 0;
        const sales = parseFloat(row[colSales]) || 0;
        const impressions = parseInt(row[colImpressions]) || 0;
        const clicks = parseInt(row[colClicks]) || 0;

        totalSpend += spend;
        totalSales += sales;
        totalImpressions += impressions;
        totalClicks += clicks;

        if (campaignMap.has(campaign)) {
          const existing = campaignMap.get(campaign)!;
          existing.spend += spend;
          existing.sales += sales;
          existing.impressions += impressions;
          existing.clicks += clicks;
        } else {
          campaignMap.set(campaign, {
            campaign,
            spend,
            sales,
            impressions,
            clicks,
            acos: 0,
            ctr: 0,
            cpc: 0
          });
        }
      });

      const campaigns = Array.from(campaignMap.values()).map(c => ({
        ...c,
        acos: c.sales > 0 ? (c.spend / c.sales) * 100 : 0,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0
      })).sort((a, b) => b.spend - a.spend); // Sort by spend descending

      const summary = {
        totalSpend,
        totalSales,
        overallAcos: totalSales > 0 ? (totalSpend / totalSales) * 100 : 0,
        totalImpressions,
        totalClicks,
        overallCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        overallCpc: totalClicks > 0 ? totalSpend / totalClicks : 0
      };

      // Generate AI Insights
      let insights = "No insights could be generated.";
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Prepare a concise summary for the AI to avoid token limits
        const topCampaigns = campaigns.slice(0, 10).map(c => 
          `${c.campaign}: Spend $${c.spend.toFixed(2)}, Sales $${c.sales.toFixed(2)}, ACoS ${c.acos.toFixed(2)}%`
        ).join('\n');

        const prompt = `
          Analyze the following Amazon PPC data summary and provide 3-4 bullet points of actionable insights and optimization suggestions.
          
          Overall Performance:
          Total Spend: $${summary.totalSpend.toFixed(2)}
          Total Sales: $${summary.totalSales.toFixed(2)}
          Overall ACoS: ${summary.overallAcos.toFixed(2)}%
          Overall CTR: ${summary.overallCtr.toFixed(2)}%
          Overall CPC: $${summary.overallCpc.toFixed(2)}
          
          Top 10 Campaigns by Spend:
          ${topCampaigns}
          
          Focus on high ACoS campaigns, opportunities for scaling, and general account health. Keep it concise.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
        });

        insights = response.text || insights;
      } catch (aiError) {
        console.error("AI Generation Error:", aiError);
        insights = "AI insights generation failed. Please check your API key or try again later.";
      }

      // Upload file to Firebase Storage if user is logged in
      let fileUrl = null;
      if (user) {
        try {
          const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          fileUrl = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.error("Failed to upload file to storage", storageErr);
        }
      }

      setReport({ summary, campaigns, insights, fileUrl });

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to process the file.');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!report || !user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'savedReports'), {
        userId: user.uid,
        toolId: 'amazon-ppc',
        name: `PPC Report - ${new Date().toLocaleDateString()}`,
        data: JSON.stringify(report),
        createdAt: new Date().toISOString()
      });
      alert('Report saved successfully!');
    } catch (err) {
      console.error("Error saving report", err);
      alert('Failed to save report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Amazon PPC Report Generator</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Upload your Amazon Ads Search Term or Campaign report to generate AI insights and visualizations.</p>
      </div>

      {!report && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                <FileSpreadsheet className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload Report</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Upload your .xlsx or .csv file containing Amazon PPC data. We'll analyze spend, sales, ACoS, and provide AI-driven recommendations.
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .csv"
              className="hidden"
            />
            
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                {file ? file.name : 'Select File'}
              </button>
              
              <button
                onClick={processData}
                disabled={!file || loading}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  'Generate Report'
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-left">{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setReport(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Upload New
            </button>
            <button
              onClick={saveReport}
              disabled={saving}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Report
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spend</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${report.summary.totalSpend.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${report.summary.totalSales.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall ACoS</p>
              <p className={`mt-2 text-3xl font-bold ${report.summary.overallAcos > 30 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {report.summary.overallAcos.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall CPC</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${report.summary.overallCpc.toFixed(2)}</p>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/30">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
              <span className="mr-2">✨</span> AI Insights & Recommendations
            </h3>
            <div className="prose dark:prose-invert max-w-none text-blue-800 dark:text-blue-200 text-sm whitespace-pre-wrap">
              {report.insights}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Top 10 Campaigns by Spend vs Sales</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.campaigns.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="campaign" tick={{fontSize: 10}} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                      itemStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Bar dataKey="spend" name="Spend ($)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sales" name="Sales ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">ACoS Trend (Top 10 Campaigns)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.campaigns.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="campaign" tick={{fontSize: 10}} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                      itemStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="acos" name="ACoS (%)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
