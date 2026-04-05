import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  Moon, 
  Sun,
  Wrench,
  Type,
  AlignLeft,
  BarChart3
} from 'lucide-react';

export const TOOLS = [
  { id: 'amazon-ppc', name: 'Amazon PPC Report', icon: BarChart3, path: '/tools/amazon-ppc', category: 'Amazon Tools', description: 'Generate AI-powered insights and charts from Amazon Ads Excel reports.' },
  { id: 'convert-case', name: 'Convert Case', icon: Type, path: '/tools/convert-case', category: 'Text Tools', description: 'Easily convert text between UPPERCASE, lowercase, Title Case, and more.' },
  { id: 'line-to-semicolon', name: 'Line to Semicolon', icon: AlignLeft, path: '/tools/line-to-semicolon', category: 'Text Tools', description: 'Convert multiline text to semicolon or comma-separated lists. Great for ASINs.' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-xl font-bold">MultiToolFlow</span>
            <button className="md:hidden ml-auto" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dashboard</p>
              <Link 
                to="/" 
                className={`mt-2 flex items-center px-2 py-2 text-sm font-medium rounded-md ${location.pathname === '/' ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Home
              </Link>
            </div>
            
            <div className="px-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tools</p>
              {TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${location.pathname === tool.path ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                  <tool.icon className="w-5 h-5 mr-3" />
                  {tool.name}
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {user ? (
              <div className="flex items-center">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="User" className="w-8 h-8 rounded-full" />
                <div className="ml-3 flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
                </div>
                <button onClick={logout} className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Log in
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button className="md:hidden text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1"></div>
          
          <div className="flex items-center space-x-4">
            <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
