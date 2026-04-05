import React, { useState } from 'react';
import { Percent, Calculator, TrendingUp, DollarSign, PieChart, ArrowRightLeft, Divide, Receipt, Tag, ShoppingCart, BookOpen, Activity } from 'lucide-react';

// --- Helper Functions ---

const formatNumber = (num: any, format: string) => {
  if (num === null || num === undefined) return '-';
  
  if (format === 'custom_tip') {
    if (!num || !isFinite(num.total) || !isFinite(num.perPerson)) return '-';
    return `Total: $${num.total.toFixed(2)} | Split: $${num.perPerson.toFixed(2)}`;
  }

  if (typeof num === 'number' && (isNaN(num) || !isFinite(num))) return '-';

  if (format === 'percent') return `${Number(num.toFixed(4))}%`;
  if (format === 'currency') return `$${Number(num.toFixed(2)).toLocaleString()}`;
  if (format === 'number') return Number(num.toFixed(4)).toLocaleString();
  if (format === 'fraction') return num; 
  if (format === 'custom_change') return num > 0 ? `+${Number(num.toFixed(4))}% (Increase)` : `${Number(num.toFixed(4))}% (Decrease)`;
  
  return num;
};

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function percentToFraction(p: number) {
  if (p === 0) return '0 / 1';
  let decimals = p.toString().split('.')[1]?.length || 0;
  let numerator = p * Math.pow(10, decimals);
  let denominator = 100 * Math.pow(10, decimals);
  let divisor = gcd(numerator, denominator);
  return `${numerator / divisor} / ${denominator / divisor}`;
}

const parse = (val: string) => val === '' ? null : Number(val);

// --- Component Definitions ---

interface CalcProps {
  title: string;
  template: string;
  inputLabels: string[];
  calculate: (v: (number | null)[]) => any;
  format: string;
  colorTheme: 'blue' | 'emerald' | 'purple' | 'amber';
  icon: React.ElementType;
}

const TemplateCalculator: React.FC<CalcProps> = ({ title, template, inputLabels, calculate, format, colorTheme, icon: Icon }) => {
  const parts = template.split(/(\{\d+\})/);
  const numInputs = inputLabels.length;
  const [values, setValues] = useState<string[]>(Array(numInputs).fill(''));

  const handleValueChange = (idx: number, val: string) => {
    const newValues = [...values];
    newValues[idx] = val;
    setValues(newValues);
  };

  const parsedValues = values.map(parse);
  const isReady = parsedValues.every(v => v !== null);
  const result = isReady ? calculate(parsedValues) : null;

  const themeColors = {
    blue: 'border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 ring-blue-500',
    emerald: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500',
    purple: 'border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-900/10 text-purple-700 dark:text-purple-300 ring-purple-500',
    amber: 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 ring-amber-500',
  };

  const iconColors = {
    blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
  };

  const resultColors = {
    blue: 'bg-blue-600 text-white',
    emerald: 'bg-emerald-600 text-white',
    purple: 'bg-purple-600 text-white',
    amber: 'bg-amber-600 text-white',
  };

  return (
    <div className={`rounded-2xl border-2 ${themeColors[colorTheme].split(' ')[0]} ${themeColors[colorTheme].split(' ')[1]} bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full`}>
      <div className="flex items-center mb-5">
        <div className={`p-2.5 rounded-xl mr-3 ${iconColors[colorTheme]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{title}</h3>
      </div>
      
      <div className="flex-1 flex flex-wrap items-center gap-2.5 text-sm md:text-base font-medium text-gray-600 dark:text-gray-300 mb-6">
        {parts.map((part, i) => {
          const match = part.match(/\{(\d+)\}/);
          if (match) {
            const idx = parseInt(match[1], 10);
            return (
              <input
                key={i}
                type="number"
                value={values[idx]}
                onChange={(e) => handleValueChange(idx, e.target.value)}
                placeholder={inputLabels[idx]}
                className={`w-28 px-3 py-2 text-center rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 outline-none transition-all focus:border-transparent ${themeColors[colorTheme].split(' ').find(c => c.startsWith('ring-'))}`}
              />
            );
          }
          return <span key={i} className="whitespace-nowrap">{part}</span>;
        })}
      </div>

      <div className={`mt-auto rounded-xl p-4 flex items-center justify-between transition-colors duration-300 ${isReady ? resultColors[colorTheme] : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Result</span>
        <span className="text-xl font-extrabold tracking-tight">{formatNumber(result, format)}</span>
      </div>
    </div>
  );
};

// --- Calculator Definitions (21 Features) ---

const calculators: CalcProps[] = [
  // --- BASIC ---
  {
    title: 'Percentage of Value',
    template: 'What is {0} % of {1} ?',
    inputLabels: ['%', 'Value'],
    calculate: (v) => v[0]! * v[1]! / 100,
    format: 'number',
    colorTheme: 'blue',
    icon: Percent
  },
  {
    title: 'Find the Percentage',
    template: '{0} is what % of {1} ?',
    inputLabels: ['Part', 'Whole'],
    calculate: (v) => (v[0]! / v[1]!) * 100,
    format: 'percent',
    colorTheme: 'blue',
    icon: Divide
  },
  {
    title: 'Find the Whole',
    template: '{0} is {1} % of what ?',
    inputLabels: ['Part', '%'],
    calculate: (v) => v[0]! / (v[1]! / 100),
    format: 'number',
    colorTheme: 'blue',
    icon: Calculator
  },
  {
    title: 'Percentage Change',
    template: 'Change from {0} to {1} ?',
    inputLabels: ['Old', 'New'],
    calculate: (v) => ((v[1]! - v[0]!) / v[0]!) * 100,
    format: 'custom_change',
    colorTheme: 'blue',
    icon: TrendingUp
  },
  {
    title: 'Percentage Difference',
    template: 'Diff between {0} and {1} ?',
    inputLabels: ['Val 1', 'Val 2'],
    calculate: (v) => Math.abs(v[0]! - v[1]!) / ((v[0]! + v[1]!) / 2) * 100,
    format: 'percent',
    colorTheme: 'blue',
    icon: ArrowRightLeft
  },
  {
    title: 'Add Percentage',
    template: '{0} + {1} %',
    inputLabels: ['Value', '%'],
    calculate: (v) => v[0]! + (v[0]! * v[1]! / 100),
    format: 'number',
    colorTheme: 'blue',
    icon: Calculator
  },
  {
    title: 'Subtract Percentage',
    template: '{0} - {1} %',
    inputLabels: ['Value', '%'],
    calculate: (v) => v[0]! - (v[0]! * v[1]! / 100),
    format: 'number',
    colorTheme: 'blue',
    icon: Calculator
  },

  // --- FINANCIAL ---
  {
    title: 'Discount Calculator',
    template: 'Price {0} with {1} % off',
    inputLabels: ['Price', 'Discount %'],
    calculate: (v) => v[0]! - (v[0]! * v[1]! / 100),
    format: 'currency',
    colorTheme: 'emerald',
    icon: Tag
  },
  {
    title: 'Double Discount',
    template: 'Price {0} minus {1} % then {2} %',
    inputLabels: ['Price', 'Disc 1 %', 'Disc 2 %'],
    calculate: (v) => v[0]! * (1 - v[1]!/100) * (1 - v[2]!/100),
    format: 'currency',
    colorTheme: 'emerald',
    icon: Tag
  },
  {
    title: 'Sales Tax',
    template: 'Price {0} + {1} % tax',
    inputLabels: ['Price', 'Tax %'],
    calculate: (v) => v[0]! * (1 + v[1]!/100),
    format: 'currency',
    colorTheme: 'emerald',
    icon: Receipt
  },
  {
    title: 'Reverse Sales Tax',
    template: 'Final {0} with {1} % tax applied',
    inputLabels: ['Final Price', 'Tax %'],
    calculate: (v) => v[0]! / (1 + v[1]!/100),
    format: 'currency',
    colorTheme: 'emerald',
    icon: Receipt
  },
  {
    title: 'Profit Margin',
    template: 'Cost {0} , Revenue {1}',
    inputLabels: ['Cost', 'Revenue'],
    calculate: (v) => ((v[1]! - v[0]!) / v[1]!) * 100,
    format: 'percent',
    colorTheme: 'emerald',
    icon: PieChart
  },
  {
    title: 'Markup Calculator',
    template: 'Cost {0} + {1} % markup',
    inputLabels: ['Cost', 'Markup %'],
    calculate: (v) => v[0]! * (1 + v[1]!/100),
    format: 'currency',
    colorTheme: 'emerald',
    icon: TrendingUp
  },
  {
    title: 'ROI (Return on Investment)',
    template: 'Invested {0} , Returned {1}',
    inputLabels: ['Invested', 'Returned'],
    calculate: (v) => ((v[1]! - v[0]!) / v[0]!) * 100,
    format: 'percent',
    colorTheme: 'emerald',
    icon: DollarSign
  },
  {
    title: 'Tip & Split Calculator',
    template: 'Bill {0} , Tip {1} %, Split {2} ways',
    inputLabels: ['Bill', 'Tip %', 'People'],
    calculate: (v) => ({ total: v[0]!*(1+v[1]!/100), perPerson: (v[0]!*(1+v[1]!/100))/v[2]! }),
    format: 'custom_tip',
    colorTheme: 'emerald',
    icon: ShoppingCart
  },

  // --- MATH & CONVERSIONS ---
  {
    title: 'Fraction to Percentage',
    template: '{0} / {1}',
    inputLabels: ['Numerator', 'Denominator'],
    calculate: (v) => (v[0]! / v[1]!) * 100,
    format: 'percent',
    colorTheme: 'purple',
    icon: Divide
  },
  {
    title: 'Percentage to Fraction',
    template: '{0} %',
    inputLabels: ['Percentage'],
    calculate: (v) => percentToFraction(v[0]!),
    format: 'fraction',
    colorTheme: 'purple',
    icon: Divide
  },
  {
    title: 'Decimal to Percentage',
    template: '{0} as %',
    inputLabels: ['Decimal'],
    calculate: (v) => v[0]! * 100,
    format: 'percent',
    colorTheme: 'purple',
    icon: Calculator
  },
  {
    title: 'Percentage to Decimal',
    template: '{0} % as decimal',
    inputLabels: ['Percentage'],
    calculate: (v) => v[0]! / 100,
    format: 'number',
    colorTheme: 'purple',
    icon: Calculator
  },
  {
    title: 'Error Percentage',
    template: 'Observed {0} , Expected {1}',
    inputLabels: ['Observed', 'Expected'],
    calculate: (v) => Math.abs(v[0]! - v[1]!) / Math.abs(v[1]!) * 100,
    format: 'percent',
    colorTheme: 'purple',
    icon: Activity
  },
  {
    title: 'Grade Percentage',
    template: 'Scored {0} out of {1}',
    inputLabels: ['Score', 'Total'],
    calculate: (v) => (v[0]! / v[1]!) * 100,
    format: 'percent',
    colorTheme: 'purple',
    icon: BookOpen
  }
];

// --- Main Component ---

export default function PercentageCalculator() {
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Basic', 'Financial', 'Math & Conversions'];

  const filteredCalculators = activeCategory === 'All' 
    ? calculators 
    : calculators.filter(c => {
        if (activeCategory === 'Basic') return c.colorTheme === 'blue';
        if (activeCategory === 'Financial') return c.colorTheme === 'emerald';
        if (activeCategory === 'Math & Conversions') return c.colorTheme === 'purple';
        return true;
      });

  return (
    <div className="max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 text-center pt-6">
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-5 shadow-sm">
          <Percent className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">Advanced Percentage Calculator</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          21 powerful, real-time calculators for finance, math, business, and everyday use.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:scale-105'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCalculators.map((calc, idx) => (
          <TemplateCalculator key={idx} {...calc} />
        ))}
      </div>
    </div>
  );
}
