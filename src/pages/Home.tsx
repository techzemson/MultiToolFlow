import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../components/Layout';
import { Search, FileText, Trash2, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface SavedReport {
  id: string;
  name: string;
  toolId: string;
  createdAt: string;
  data: string;
}

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedReports();
    } else {
      setSavedReports([]);
    }
  }, [user]);

  const fetchSavedReports = async () => {
    if (!user) return;
    setLoadingReports(true);
    try {
      const q = query(
        collection(db, 'savedReports'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const reports: SavedReport[] = [];
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as SavedReport);
      });
      reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSavedReports(reports);
    } catch (err) {
      console.error("Error fetching reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'savedReports', id));
      setSavedReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Error deleting report", err);
    }
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(TOOLS.map(t => t.category)))], []);

  const filteredTools = useMemo(() => {
    return TOOLS.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedTools = useMemo(() => {
    const groups: Record<string, typeof TOOLS> = {};
    filteredTools.forEach(tool => {
      if (!groups[tool.category]) {
        groups[tool.category] = [];
      }
      groups[tool.category].push(tool);
    });
    return groups;
  }, [filteredTools]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-16 md:py-20">
        <h1 className="text-4xl md:text-5xl lg:text-[54px] font-bold text-[#2d3748] dark:text-white tracking-tight leading-tight">
          Every tool you need in one place
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
          Every tool you need at your fingertips. All are 100% FREE and easy to use! Convert, format, analyze, and optimize your workflows with just a few clicks.
        </p>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-[#2d3748] text-white shadow-sm dark:bg-white dark:text-gray-900 border border-transparent'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar (Subtle) */}
      <div className="max-w-2xl mx-auto mb-12 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-base transition-all shadow-sm hover:shadow-md"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Saved Reports */}
      {user && savedReports.length > 0 && (
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Saved Reports</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedReports.map(report => {
              const tool = TOOLS.find(t => t.id === report.toolId);
              return (
                <div key={report.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5 mr-2" />
                      <span className="font-semibold truncate">{report.name}</span>
                    </div>
                    <button onClick={() => deleteReport(report.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {new Date(report.createdAt).toLocaleDateString()} • {tool?.name || 'Unknown Tool'}
                  </p>
                  <div className="mt-auto">
                    <Link to={`/tools/${report.toolId}`} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                      Open Tool <span className="ml-1">→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 border-dashed">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tools found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            We couldn't find any tools matching "{searchQuery}" in the {selectedCategory} category.
          </p>
          <button 
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="mt-6 px-6 py-2 bg-[#2d3748] text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.path}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 flex flex-col h-full"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-[#2d3748] group-hover:text-white text-[#2d3748] dark:text-gray-200 transition-colors duration-200">
                  <tool.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#2d3748] dark:group-hover:text-gray-200 transition-colors duration-200">
                  {tool.name}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow leading-relaxed">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
