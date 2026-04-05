import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, Package, Truck, DollarSign, TrendingUp, PieChart as PieChartIcon, 
  Sparkles, AlertCircle, Info, ArrowRight, Copy, Check, Target, Scale,
  Globe, HelpCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// --- Constants & Data ---

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (Default)' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
];

const CATEGORIES = [
  { name: 'Electronics & Accessories', fee: 0.08 },
  { name: 'Clothing & Apparel', fee: 0.17 },
  { name: 'Home & Kitchen', fee: 0.15 },
  { name: 'Beauty & Personal Care', fee: 0.15 },
  { name: 'Toys & Games', fee: 0.15 },
  { name: 'Books & Media', fee: 0.15 },
  { name: 'Other / General', fee: 0.15 },
];

const FBA_TIERS_USD = [
  { id: 'small', name: 'Small Standard (Under 1 lb)', fee: 3.22 },
  { id: 'large_1', name: 'Large Standard (1 to 2 lb)', fee: 4.75 },
  { id: 'large_2', name: 'Large Standard (2 to 3 lb)', fee: 5.40 },
  { id: 'oversize', name: 'Oversize (Over 3 lb)', fee: 9.00 },
];

const FBA_TIERS_INR = [
  { id: 'small', name: 'Small (Under 500g)', fee: 60 },
  { id: 'standard', name: 'Standard (500g - 1kg)', fee: 110 },
  { id: 'heavy', name: 'Heavy (1kg - 2kg)', fee: 200 },
  { id: 'oversize', name: 'Oversize (Over 2kg)', fee: 350 },
];

// --- Main Component ---

export default function AmazonCalculator() {
  // --- State ---
  const [currency, setCurrency] = useState('INR');
  const [copied, setCopied] = useState(false);
  
  // Inputs (Using strings to fix the "typing decimal/empty" bug)
  const [price, setPrice] = useState('999');
  const [cost, setCost] = useState('250');
  const [categoryFee, setCategoryFee] = useState('0.15');
  const [weightTier, setWeightTier] = useState('standard');
  const [storageMonths, setStorageMonths] = useState('1');
  const [fbmShipping, setFbmShipping] = useState('80');
  const [ppc, setPpc] = useState('50');
  const [returnRate, setReturnRate] = useState('5'); // Percentage
  const [otherCosts, setOtherCosts] = useState('20');
  const [targetMargin, setTargetMargin] = useState('25'); // Percentage

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  // --- Parsed Values ---
  const p = parseFloat(price) || 0;
  const c = parseFloat(cost) || 0;
  const catFee = parseFloat(categoryFee) || 0;
  const fbmS = parseFloat(fbmShipping) || 0;
  const ppcCost = parseFloat(ppc) || 0;
  const retRate = parseFloat(returnRate) || 0;
  const other = parseFloat(otherCosts) || 0;
  const months = parseFloat(storageMonths) || 0;
  const tMargin = parseFloat(targetMargin) || 0;

  // --- Calculations ---
  const activeCurrency = CURRENCIES.find(curr => curr.code === currency) || CURRENCIES[0];
  const sym = activeCurrency.symbol;
  const isINR = currency === 'INR';
  const fbaTiers = isINR ? FBA_TIERS_INR : FBA_TIERS_USD;
  
  // 1. Referral Fee
  const referralFee = p * catFee;
  
  // 2. Closing Fee (Amazon India specific, simplified for others)
  let closingFee = 0;
  if (isINR) {
    if (p <= 250) closingFee = 25;
    else if (p <= 500) closingFee = 30;
    else if (p <= 1000) closingFee = 50;
    else closingFee = 61;
  } else {
    closingFee = 0.99; // Simplified individual seller fee or fixed closing fee
  }

  // 3. FBA Fulfillment Fee
  const selectedTier = fbaTiers.find(t => t.id === weightTier) || fbaTiers[0];
  const fbaFee = selectedTier.fee;

  // 4. Storage Fee (Simplified)
  const storageFeePerMonth = isINR ? 30 : 0.83; 
  const totalStorageFee = storageFeePerMonth * months;

  // 5. Returns Cost (Lost fees, return shipping, unsellable inventory)
  const returnCost = p * (retRate / 100);

  // --- Totals ---
  const totalFbaFees = referralFee + closingFee + fbaFee + totalStorageFee;
  const totalFbmFees = referralFee + closingFee + fbmS;
  
  const fixedFbaCosts = c + fbaFee + totalStorageFee + ppcCost + other + closingFee;
  const fixedFbmCosts = c + fbmS + ppcCost + other + closingFee;

  const totalFbaCost = fixedFbaCosts + referralFee + returnCost;
  const totalFbmCost = fixedFbmCosts + referralFee + returnCost;

  const fbaProfit = p - totalFbaCost;
  const fbmProfit = p - totalFbmCost;

  const fbaMargin = p > 0 ? (fbaProfit / p) * 100 : 0;
  const fbmMargin = p > 0 ? (fbmProfit / p) * 100 : 0;

  const fbaROI = c > 0 ? (fbaProfit / c) * 100 : 0;
  const fbmROI = c > 0 ? (fbmProfit / c) * 100 : 0;

  // --- Advanced Features: Break-even & Target Price ---
  const variableFeePercentage = catFee + (retRate / 100);
  
  let breakEvenFBA = 0;
  let targetPriceFBA = 0;
  
  if (variableFeePercentage < 1) {
    breakEvenFBA = fixedFbaCosts / (1 - variableFeePercentage);
    
    const targetDivisor = 1 - (tMargin / 100) - variableFeePercentage;
    if (targetDivisor > 0) {
      targetPriceFBA = fixedFbaCosts / targetDivisor;
    }
  }

  // --- Chart Data ---
  const fbaChartData = [
    { name: 'Product Cost', value: c, color: '#94a3b8' },
    { name: 'Amazon Fees', value: totalFbaFees, color: '#f59e0b' },
    { name: 'Marketing (PPC)', value: ppcCost, color: '#8b5cf6' },
    { name: 'Returns & Other', value: returnCost + other, color: '#ef4444' },
    { name: 'Net Profit', value: Math.max(0, fbaProfit), color: '#10b981' },
  ].filter(d => d.value > 0);

  // --- Handlers ---
  const handleCurrencyToggle = (code: string) => {
    setCurrency(code);
    // Adjust defaults to make sense in the new currency
    if (code === 'INR') {
      setPrice('999');
      setCost('250');
      setFbmShipping('80');
      setPpc('50');
      setOtherCosts('20');
      setWeightTier('standard');
    } else {
      setPrice('29.99');
      setCost('8.00');
      setFbmShipping('5.00');
      setPpc('2.00');
      setOtherCosts('1.00');
      setWeightTier('small');
    }
    setAiInsights(null);
  };

  const copyResults = () => {
    const text = `Amazon Profit Estimate (${currency})
Selling Price: ${sym}${p.toFixed(2)}
Product Cost: ${sym}${c.toFixed(2)}

FBA Profit: ${sym}${fbaProfit.toFixed(2)} (${fbaMargin.toFixed(1)}% Margin)
FBM Profit: ${sym}${fbmProfit.toFixed(2)} (${fbmMargin.toFixed(1)}% Margin)

Break-even Price (FBA): ${sym}${breakEvenFBA.toFixed(2)}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateAIInsights = async () => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `I am a new Amazon seller. I am analyzing a product with the following details:
      Currency: ${currency}
      Selling Price: ${sym}${p.toFixed(2)}
      Sourcing Cost: ${sym}${c.toFixed(2)}
      FBA Profit: ${sym}${fbaProfit.toFixed(2)} (${fbaMargin.toFixed(1)}% margin, ${fbaROI.toFixed(1)}% ROI)
      FBM Profit: ${sym}${fbmProfit.toFixed(2)} (${fbmMargin.toFixed(1)}% margin, ${fbmROI.toFixed(1)}% ROI)
      Return Rate: ${retRate}%
      PPC Cost: ${sym}${ppcCost.toFixed(2)}
      Break-even Price: ${sym}${breakEvenFBA.toFixed(2)}

      Please provide 3 beginner-friendly bullet points of advice. 
      1. Is this a good product to launch based on the margins? (Usually 20-30% is good).
      2. Should I use FBA or FBM for this specific profile?
      3. What hidden risks or fees should I watch out for?
      Keep it concise, professional, and highly educational for a beginner. Format as a clean markdown list.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      setAiInsights(response.text || "No insights generated.");
    } catch (err) {
      console.error(err);
      setAiInsights("Failed to load AI insights. Please ensure your Gemini API key is configured correctly.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Render Helpers ---
  const InputGroup = ({ label, tooltip, children }: { label: string, tooltip: string, children: React.ReactNode }) => (
    <div className="mb-4 relative group">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
          {label}
          <div className="ml-1.5 text-gray-400 hover:text-blue-500 cursor-help relative">
            <HelpCircle className="w-4 h-4" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none text-center shadow-xl font-normal leading-relaxed">
              {tooltip}
              <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </label>
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center pt-6">
        <div className="inline-flex items-center justify-center p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-5 shadow-sm">
          <Package className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">Amazon Profit Calculator</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          The ultimate tool for new Amazon sellers. Calculate FBA vs FBM profits, discover your break-even price, and get AI-powered insights before launching.
        </p>
      </div>

      {/* Currency Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            onClick={() => handleCurrencyToggle(c.code)}
            className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              currency === c.code
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-105'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <span className="mr-1.5 opacity-70">{c.symbol}</span> {c.code}
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* LEFT COLUMN: Inputs */}
        <div className="w-full xl:w-[420px] flex-shrink-0 space-y-6">
          
          {/* Step 1: Core Product Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center">
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
              Product & Sourcing
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Selling Price" tooltip="The final price the customer pays on Amazon.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
                </div>
              </InputGroup>
              <InputGroup label="Sourcing Cost" tooltip="Cost to manufacture and ship the product to Amazon's warehouse.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={cost} onChange={e => setCost(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
                </div>
              </InputGroup>
            </div>
            <InputGroup label="Product Category" tooltip="Amazon charges a referral fee (commission) based on the category.">
              <select value={categoryFee} onChange={e => setCategoryFee(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-medium transition-all">
                {CATEGORIES.map(c => (
                  <option key={c.name} value={c.fee}>{c.name} ({(c.fee * 100).toFixed(0)}%)</option>
                ))}
              </select>
            </InputGroup>
          </div>

          {/* Step 2: Fulfillment Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center">
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
              Fulfillment (FBA & FBM)
            </h2>
            <InputGroup label="FBA Size & Weight Tier" tooltip="Determines the FBA pick, pack, and ship fee. Larger/heavier items cost more.">
              <select value={weightTier} onChange={e => setWeightTier(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white font-medium transition-all">
                {fbaTiers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {sym}{t.fee.toFixed(2)}</option>
                ))}
              </select>
            </InputGroup>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Storage Time" tooltip="Estimated months the item sits in Amazon's warehouse before selling.">
                <div className="relative">
                  <input type="number" value={storageMonths} onChange={e => setStorageMonths(e.target.value)} className="w-full pr-12 pl-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">mos</span>
                </div>
              </InputGroup>
              <InputGroup label="FBM Shipping" tooltip="Your cost to ship the item directly to the customer (if you don't use FBA).">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={fbmShipping} onChange={e => setFbmShipping(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
                </div>
              </InputGroup>
            </div>
          </div>

          {/* Step 3: Marketing & Other Costs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center">
              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">3</span>
              Marketing & Extras
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="PPC Cost / Unit" tooltip="Average advertising spend (Amazon PPC) required to sell one unit.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={ppc} onChange={e => setPpc(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
                </div>
              </InputGroup>
              <InputGroup label="Return Rate" tooltip="Percentage of items returned. Returns cost you referral fees and return shipping.">
                <div className="relative">
                  <input type="number" value={returnRate} onChange={e => setReturnRate(e.target.value)} className="w-full pr-8 pl-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                </div>
              </InputGroup>
            </div>
            <InputGroup label="Other Fixed Costs" tooltip="Packaging, inserts, prep center fees, or software costs per unit.">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                <input type="number" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white font-semibold transition-all" />
              </div>
            </InputGroup>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & AI */}
        <div className="flex-1 space-y-6">
          
          {/* Top Cards: FBA vs FBM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FBA Card */}
            <div className={`rounded-2xl p-6 border-2 transition-all ${fbaProfit > 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center">
                    FBA Profit <span className="ml-2 text-xs font-bold px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">Fulfilled by Amazon</span>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hands-off fulfillment</p>
                </div>
                <div className={`p-3 rounded-xl ${fbaProfit > 0 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              
              <div className="mb-6">
                <div className={`text-5xl font-black tracking-tighter ${fbaProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sym}{fbaProfit.toFixed(2)}
                </div>
                <div className="flex items-center mt-2 space-x-4">
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${fbaMargin >= 20 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : fbaMargin > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                    {fbaMargin.toFixed(1)}% Margin
                  </span>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {fbaROI.toFixed(1)}% ROI
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Referral Fee</span> <span>-{sym}{referralFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> FBA Fee</span> <span>-{sym}{fbaFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Storage Fee</span> <span>-{sym}{totalStorageFee.toFixed(2)}</span></div>
                {closingFee > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Closing Fee</span> <span>-{sym}{closingFee.toFixed(2)}</span></div>}
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white">
                  <span>Total Amazon Fees</span> <span>{sym}{totalFbaFees.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* FBM Card */}
            <div className={`rounded-2xl p-6 border-2 transition-all ${fbmProfit > 0 ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center">
                    FBM Profit <span className="ml-2 text-xs font-bold px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">Fulfilled by Merchant</span>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You ship it yourself</p>
                </div>
                <div className={`p-3 rounded-xl ${fbmProfit > 0 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                  <Truck className="w-6 h-6" />
                </div>
              </div>
              
              <div className="mb-6">
                <div className={`text-5xl font-black tracking-tighter ${fbmProfit > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sym}{fbmProfit.toFixed(2)}
                </div>
                <div className="flex items-center mt-2 space-x-4">
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${fbmMargin >= 20 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : fbmMargin > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                    {fbmMargin.toFixed(1)}% Margin
                  </span>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {fbmROI.toFixed(1)}% ROI
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Referral Fee</span> <span>-{sym}{referralFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Your Shipping</span> <span>-{sym}{fbmS.toFixed(2)}</span></div>
                {closingFee > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Closing Fee</span> <span>-{sym}{closingFee.toFixed(2)}</span></div>}
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white">
                  <span>Total FBM Fees</span> <span>{sym}{totalFbmFees.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Features: Break-even & Target Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center">
                <Scale className="w-4 h-4 mr-2" /> Break-Even Price (FBA)
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">The minimum price to sell without losing money.</p>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {breakEvenFBA > 0 ? `${sym}${breakEvenFBA.toFixed(2)}` : 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                  <Target className="w-4 h-4 mr-2" /> Target Margin Price
                </h3>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
                  <input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} className="w-10 bg-transparent text-right text-sm font-bold outline-none text-gray-900 dark:text-white" />
                  <span className="text-sm font-bold text-gray-500 ml-1">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Price needed to hit your target margin.</p>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                {targetPriceFBA > 0 ? `${sym}${targetPriceFBA.toFixed(2)}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Charts & AI Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Cost Breakdown Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <PieChartIcon className="w-5 h-5 mr-2 text-indigo-500" /> FBA Cost Breakdown
                </h3>
                <button onClick={copyResults} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Copy Results">
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fbaChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                      {fbaChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => `${sym}${value.toFixed(2)}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800/30 p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center relative z-10">
                <Sparkles className="w-5 h-5 mr-2 text-indigo-500" /> AI Seller Consultant
              </h3>
              <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70 mb-4 relative z-10">
                Get beginner-friendly advice on your margins, fees, and launch strategy based on these numbers.
              </p>
              
              <div className="flex-1 flex flex-col relative z-10">
                {!aiInsights && !aiLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <button 
                      onClick={generateAIInsights}
                      className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Analyze My Product
                    </button>
                  </div>
                ) : aiLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">Analyzing margins & fees...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="prose prose-sm dark:prose-invert prose-indigo max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: aiInsights?.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '' }} />
                    </div>
                    <button 
                      onClick={generateAIInsights}
                      className="mt-4 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3 mr-1" /> Re-analyze
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
