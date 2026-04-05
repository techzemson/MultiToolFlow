import React, { useState, useMemo } from 'react';
import { 
  Calculator, Package, Truck, DollarSign, TrendingUp, PieChart as PieChartIcon, 
  Sparkles, IndianRupee, AlertCircle, Info, ArrowRight, Copy, Check, BarChart3, Tag
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// --- Constants & Data ---

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
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [copied, setCopied] = useState(false);
  
  // Inputs
  const [price, setPrice] = useState<number>(29.99);
  const [cost, setCost] = useState<number>(8.00);
  const [categoryFee, setCategoryFee] = useState<number>(0.15);
  const [weightTier, setWeightTier] = useState<string>('small');
  const [storageMonths, setStorageMonths] = useState<number>(1);
  const [fbmShipping, setFbmShipping] = useState<number>(5.00);
  const [ppc, setPpc] = useState<number>(2.00);
  const [returnRate, setReturnRate] = useState<number>(5); // Percentage
  const [otherCosts, setOtherCosts] = useState<number>(1.00);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  // --- Calculations ---
  const sym = currency === 'USD' ? '$' : '₹';
  const fbaTiers = currency === 'USD' ? FBA_TIERS_USD : FBA_TIERS_INR;
  
  // 1. Referral Fee
  const referralFee = price * categoryFee;
  
  // 2. Closing Fee (Amazon India specific, simplified for USD)
  let closingFee = 0;
  if (currency === 'INR') {
    if (price <= 250) closingFee = 25;
    else if (price <= 500) closingFee = 30;
    else if (price <= 1000) closingFee = 50;
    else closingFee = 61;
  } else {
    closingFee = 0.99; // Simplified individual seller fee or fixed closing fee
  }

  // 3. FBA Fulfillment Fee
  const selectedTier = fbaTiers.find(t => t.id === weightTier) || fbaTiers[0];
  const fbaFee = selectedTier.fee;

  // 4. Storage Fee (Simplified)
  const storageFeePerMonth = currency === 'USD' ? 0.83 : 30; // $0.83 or ₹30 per unit approx
  const totalStorageFee = storageFeePerMonth * storageMonths;

  // 5. Returns Cost (Lost fees, return shipping, unsellable inventory)
  const returnCost = price * (returnRate / 100);

  // --- Totals ---
  const totalFbaFees = referralFee + closingFee + fbaFee + totalStorageFee;
  const totalFbmFees = referralFee + closingFee + fbmShipping;
  
  const totalFbaCost = cost + totalFbaFees + ppc + returnCost + otherCosts;
  const totalFbmCost = cost + totalFbmFees + ppc + returnCost + otherCosts;

  const fbaProfit = price - totalFbaCost;
  const fbmProfit = price - totalFbmCost;

  const fbaMargin = price > 0 ? (fbaProfit / price) * 100 : 0;
  const fbmMargin = price > 0 ? (fbmProfit / price) * 100 : 0;

  const fbaROI = cost > 0 ? (fbaProfit / cost) * 100 : 0;
  const fbmROI = cost > 0 ? (fbmProfit / cost) * 100 : 0;

  const breakEvenFBA = totalFbaCost - fbaProfit + price; // Simplified break-even

  // --- Chart Data ---
  const fbaChartData = [
    { name: 'Product Cost', value: cost, color: '#94a3b8' },
    { name: 'Amazon Fees', value: totalFbaFees, color: '#f59e0b' },
    { name: 'Marketing (PPC)', value: ppc, color: '#8b5cf6' },
    { name: 'Returns & Other', value: returnCost + otherCosts, color: '#ef4444' },
    { name: 'Net Profit', value: Math.max(0, fbaProfit), color: '#10b981' },
  ].filter(d => d.value > 0);

  // --- Handlers ---
  const handleCurrencyToggle = (c: 'USD' | 'INR') => {
    setCurrency(c);
    // Adjust defaults to make sense in the new currency
    if (c === 'INR') {
      setPrice(999);
      setCost(250);
      setFbmShipping(80);
      setPpc(50);
      setOtherCosts(20);
      setWeightTier('standard');
    } else {
      setPrice(29.99);
      setCost(8.00);
      setFbmShipping(5.00);
      setPpc(2.00);
      setOtherCosts(1.00);
      setWeightTier('small');
    }
    setAiInsights(null);
  };

  const copyResults = () => {
    const text = `Amazon Profit Estimate (${currency})
Selling Price: ${sym}${price.toFixed(2)}
Product Cost: ${sym}${cost.toFixed(2)}

FBA Profit: ${sym}${fbaProfit.toFixed(2)} (${fbaMargin.toFixed(1)}% Margin)
FBM Profit: ${sym}${fbmProfit.toFixed(2)} (${fbmMargin.toFixed(1)}% Margin)
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
      Selling Price: ${sym}${price.toFixed(2)}
      Sourcing Cost: ${sym}${cost.toFixed(2)}
      FBA Profit: ${sym}${fbaProfit.toFixed(2)} (${fbaMargin.toFixed(1)}% margin, ${fbaROI.toFixed(1)}% ROI)
      FBM Profit: ${sym}${fbmProfit.toFixed(2)} (${fbmMargin.toFixed(1)}% margin, ${fbmROI.toFixed(1)}% ROI)
      Return Rate: ${returnRate}%
      PPC Cost: ${sym}${ppc.toFixed(2)}

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
            <Info className="w-4 h-4" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-center shadow-xl">
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
          The ultimate tool for new Amazon sellers. Calculate FBA vs FBM profits, analyze fees, and get AI-powered insights before launching your product.
        </p>
      </div>

      {/* Currency Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl inline-flex shadow-inner">
          <button
            onClick={() => handleCurrencyToggle('USD')}
            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${currency === 'USD' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <DollarSign className="w-4 h-4 mr-2" /> USD ($)
          </button>
          <button
            onClick={() => handleCurrencyToggle('INR')}
            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${currency === 'INR' ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <IndianRupee className="w-4 h-4 mr-2" /> INR (₹)
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* LEFT COLUMN: Inputs */}
        <div className="w-full xl:w-[400px] flex-shrink-0 space-y-6">
          
          {/* Core Product Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-blue-500" /> Product Pricing
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Selling Price" tooltip="The price the customer pays on Amazon.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-semibold" />
                </div>
              </InputGroup>
              <InputGroup label="Sourcing Cost" tooltip="Manufacturing + Shipping to your warehouse/Amazon.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-semibold" />
                </div>
              </InputGroup>
            </div>
            <InputGroup label="Product Category" tooltip="Amazon charges a referral fee based on the category (usually 8% to 17%).">
              <select value={categoryFee} onChange={e => setCategoryFee(Number(e.target.value))} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-medium">
                {CATEGORIES.map(c => (
                  <option key={c.name} value={c.fee}>{c.name} ({(c.fee * 100).toFixed(0)}%)</option>
                ))}
              </select>
            </InputGroup>
          </div>

          {/* Fulfillment Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-amber-500" /> Fulfillment (FBA & FBM)
            </h2>
            <InputGroup label="FBA Size & Weight Tier" tooltip="Determines the FBA pick, pack, and ship fee.">
              <select value={weightTier} onChange={e => setWeightTier(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white font-medium">
                {fbaTiers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {sym}{t.fee.toFixed(2)}</option>
                ))}
              </select>
            </InputGroup>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Storage Time" tooltip="Months the item sits in Amazon's warehouse before selling.">
                <div className="relative">
                  <input type="number" value={storageMonths} onChange={e => setStorageMonths(Number(e.target.value))} className="w-full pr-12 pl-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white font-semibold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">mos</span>
                </div>
              </InputGroup>
              <InputGroup label="FBM Shipping" tooltip="Your cost to ship the item directly to the customer (if using FBM).">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={fbmShipping} onChange={e => setFbmShipping(Number(e.target.value))} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 dark:text-white font-semibold" />
                </div>
              </InputGroup>
            </div>
          </div>

          {/* Marketing & Other Costs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-500" /> Marketing & Returns
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="PPC Cost / Unit" tooltip="Average advertising spend required to sell one unit.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                  <input type="number" value={ppc} onChange={e => setPpc(Number(e.target.value))} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white font-semibold" />
                </div>
              </InputGroup>
              <InputGroup label="Return Rate" tooltip="Percentage of items returned by customers.">
                <div className="relative">
                  <input type="number" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))} className="w-full pr-8 pl-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white font-semibold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                </div>
              </InputGroup>
            </div>
            <InputGroup label="Other Fixed Costs" tooltip="Packaging, inserts, prep center fees, etc.">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{sym}</span>
                <input type="number" value={otherCosts} onChange={e => setOtherCosts(Number(e.target.value))} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white font-semibold" />
              </div>
            </InputGroup>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & AI */}
        <div className="flex-1 space-y-8">
          
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
                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Your Shipping</span> <span>-{sym}{fbmShipping.toFixed(2)}</span></div>
                {closingFee > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 opacity-50"/> Closing Fee</span> <span>-{sym}{closingFee.toFixed(2)}</span></div>}
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white">
                  <span>Total FBM Fees</span> <span>{sym}{totalFbmFees.toFixed(2)}</span>
                </div>
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
