import { useState, useEffect } from 'react';
import { ShortUrl, AnalyticsData } from '../types.ts';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Loader2, Globe, MonitorSmartphone, MousePointerClick, Calendar } from 'lucide-react';

interface Props {
  url: ShortUrl;
  user: FirebaseUser;
}

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#f1f5f9'];

export default function AnalyticsView({ url, user }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/urls/${url.id}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { isMounted = false; };
  }, [url.id, user]);

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
      </div>
    );
  }

  const hasData = data.totalClicks > 0;

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pb-4 pr-2 scrollbar-hide">
      {/* Top Header Card */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Analytics Report</p>
          <h2 className="text-2xl font-black text-slate-900 truncate max-w-[200px] md:max-w-[300px]">/r/{url.alias}</h2>
          <a 
            href={url.originalUrl} 
            target="_blank" 
            rel="noreferrer"
            className="text-sm font-mono text-indigo-600 hover:underline inline-block max-w-[200px] md:max-w-[400px] truncate mt-1"
          >
            {url.originalUrl}
          </a>
        </div>
        <div className="bg-indigo-600 border-2 border-slate-900 rounded-xl px-5 py-3 text-white font-bold flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <span className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Total Clicks</span>
          <span className="text-3xl leading-none">{data.totalClicks}</span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 bg-white border-2 border-slate-900 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <p className="text-slate-500 font-bold">No clicks recorded yet.</p>
          <p className="text-sm text-slate-400 mt-2">Share your link to start collecting analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Devices Chart */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5 text-indigo-500" /> Devices
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.devices}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    stroke="#0f172a"
                    strokeWidth={2}
                  >
                    {data.devices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '2px solid #0f172a', boxShadow: '2px 2px 0px 0px rgba(15,23,42,1)', fontWeight: 'bold' }} 
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Browsers Chart */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" /> Browsers
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.browsers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: '2px solid #0f172a', boxShadow: '2px 2px 0px 0px rgba(15,23,42,1)', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} stroke="#0f172a" strokeWidth={2} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Operating Systems */}
          <div className="md:col-span-1 bg-slate-900 border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5 text-indigo-400" /> OS
            </h3>
            <div className="space-y-4">
              {data.os.sort((a,b) => b.count - a.count).map(o => (
                <div key={o.name} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-16 truncate">{o.name}</span>
                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(o.count / data.totalClicks) * 100}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-white w-10 text-right">{Math.round((o.count / data.totalClicks) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="md:col-span-1 bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" /> Top Countries
            </h3>
            <div className="space-y-4">
              {data.countries.sort((a,b) => b.count - a.count).map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600 w-16 truncate">{c.name}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(c.count / data.totalClicks) * 100}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-10 text-right">{Math.round((c.count / data.totalClicks) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
