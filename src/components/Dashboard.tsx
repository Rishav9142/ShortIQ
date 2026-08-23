import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { ShortUrl } from '../types.ts';
import { LogOut, Plus, Link2, Copy, BarChart2, Trash2 } from 'lucide-react';
import AnalyticsView from './AnalyticsView.tsx';

interface Props {
  user: FirebaseUser;
}

export default function Dashboard({ user }: Props) {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<ShortUrl | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchUrls = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/urls', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUrls(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ originalUrl, customAlias, expiresAt: expiresAt || null })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create short URL');
      } else {
        setOriginalUrl('');
        setCustomAlias('');
        setExpiresAt('');
        fetchUrls();
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this URL?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/urls/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedUrl?.id === id) setSelectedUrl(null);
        fetchUrls();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (e: React.MouseEvent, alias: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/r/${alias}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(alias);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans overflow-hidden">
      <header className="flex justify-between items-center p-6 bg-[#F1F5F9] sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ShortIQ</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center font-bold text-indigo-900 active:translate-y-0.5 active:shadow-none transition-all overflow-hidden"
              title="Profile"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.email?.charAt(0).toUpperCase() || 'U'
              )}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-3 w-56 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-4 z-50 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Logged in as</span>
                {user.displayName && (
                  <span className="text-sm font-bold text-slate-900 truncate">{user.displayName}</span>
                )}
                <span className="text-sm font-mono text-slate-600 truncate">{user.email || 'Guest User'}</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="px-4 py-2 border-2 border-slate-900 rounded-xl bg-white font-bold text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 text-slate-900 hover:bg-slate-50"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-5rem)] min-h-0">
        
        {/* Left Column: Form & List */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">
          <section className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Shorten New Destination</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input 
                type="url"
                required
                placeholder="https://example.com/very-long-url"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 font-mono text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
                value={originalUrl}
                onChange={e => setOriginalUrl(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  type="text"
                  placeholder="custom-alias"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 font-mono text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
                  value={customAlias}
                  onChange={e => setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                />
                <input 
                  type="datetime-local"
                  title="Expiration date (optional)"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-sm focus:outline-none focus:border-indigo-500 text-slate-900"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 mt-1 bg-slate-900 text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center disabled:opacity-70"
              >
                {loading ? '...' : 'Shorten'}
              </button>
            </form>
            {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}
            <div className="mt-4 flex gap-6">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Analytics Active
              </div>
            </div>
          </section>

          <section className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex-1 flex flex-col overflow-hidden min-h-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 shrink-0">Your Links ({urls.length})</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {urls.length === 0 ? (
                <div className="text-center text-slate-400 text-sm font-bold mt-8">
                  No links created yet.
                </div>
              ) : (
                urls.map(url => (
                  <button
                    key={url.id}
                    onClick={() => setSelectedUrl(url)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border-2 flex flex-col gap-1 ${
                      selectedUrl?.id === url.id 
                        ? 'bg-indigo-50 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' 
                        : 'bg-white border-slate-200 hover:border-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-900 text-sm">/r/{url.alias}</span>
                      <div className="flex items-center gap-2">
                        <div 
                          onClick={(e) => copyToClipboard(e, url.alias)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                          title="Copy link"
                        >
                          {copySuccess === url.alias ? (
                            <span className="text-xs text-green-600 font-bold px-1">Copied</span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </div>
                        <div 
                          onClick={(e) => handleDelete(e, url.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate w-full" title={url.originalUrl}>
                      {url.originalUrl}
                    </div>
                    {url.expiresAt && (
                      <div className="text-xs font-bold text-red-500 mt-1">
                        Expires: {new Date(url.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Analytics */}
        <div className="lg:col-span-7 h-full min-h-0">
          {selectedUrl ? (
            <AnalyticsView url={selectedUrl} user={user} />
          ) : (
            <div className="h-full bg-white border-2 border-slate-900 rounded-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-slate-200 flex items-center justify-center mb-4">
                <BarChart2 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">Select a link to view analytics</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
