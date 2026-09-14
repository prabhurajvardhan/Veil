import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Markdown from 'react-markdown';
import { Menu, X, Book, ChevronRight } from 'lucide-react';

const mdFiles = import.meta.glob('../docs/**/*.md', { query: '?raw', import: 'default', eager: true });

const navTree = {};
const routes = [];

for (const path in mdFiles) {
  const parts = path.replace('../docs/', '').split('/');
  const filename = parts.pop();
  const title = filename.replace('.md', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const routePath = '/' + path.replace('../docs/', '').replace('.md', '');
  
  routes.push({
    path: routePath,
    content: mdFiles[path],
    title
  });

  if (parts.length === 0) {
    if (!navTree['Root']) navTree['Root'] = [];
    navTree['Root'].push({ title, path: routePath });
  } else {
    const category = parts[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (!navTree[category]) navTree[category] = [];
    navTree[category].push({ title, path: routePath });
  }
}

const sortedCategories = Object.keys(navTree).sort();

function DocViewer({ content }) {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
      <Markdown>{content}</Markdown>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col`}>
        <div className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2 font-bold text-lg text-gray-800 dark:text-gray-100">
            <Book className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Veil Architecture</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {sortedCategories.map(category => (
            <div key={category}>
              <h3 className="font-semibold text-xs tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-3 pl-2">
                {category.replace(/^\d+\s/, '')}
              </h3>
              <ul className="space-y-1">
                {navTree[category].map(item => {
                  const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/README');
                  return (
                    <li key={item.path}>
                      <Link 
                        to={item.path}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-900">
        <header className="h-16 md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1 -ml-1 mr-3 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800 dark:text-gray-100">Veil Architecture</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16">
          <div className="max-w-4xl mx-auto pb-20">
            <Routes>
              {routes.map(route => (
                <Route 
                  key={route.path} 
                  path={route.path} 
                  element={<DocViewer content={route.content} />} 
                />
              ))}
              <Route 
                path="/" 
                element={<DocViewer content={routes.find(r => r.path === '/README')?.content || '# Welcome to Veil Architecture Docs\n\nPlease select a document from the sidebar.'} />} 
              />
              <Route path="*" element={
                <div className="text-center py-20">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p className="text-gray-500">Document not found.</p>
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
