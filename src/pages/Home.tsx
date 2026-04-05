import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../components/Layout';
import { Search, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

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
      // Sort client-side since we might need a composite index for orderBy
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

  const filteredTools = TOOLS.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(TOOLS.map(t => t.category)));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to MultiToolFlow</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Select a tool below to get started.</p>
      </div>

      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {user && savedReports.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Your Saved Reports</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedReports.map(report => {
              const tool = TOOLS.find(t => t.id === report.toolId);
              return (
                <div key={report.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5 mr-2" />
                      <span className="font-medium truncate">{report.name}</span>
                    </div>
                    <button onClick={() => deleteReport(report.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {new Date(report.createdAt).toLocaleDateString()} • {tool?.name || 'Unknown Tool'}
                  </p>
                  <div className="mt-auto">
                    <Link to={`/tools/${report.toolId}`} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                      Open Tool →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {categories.map(category => {
        const categoryTools = filteredTools.filter(t => t.category === category);
        if (categoryTools.length === 0) return null;

        return (
          <div key={category} className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{category}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
                >
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                        <tool.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{tool.name}</h3>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      
      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No tools found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
