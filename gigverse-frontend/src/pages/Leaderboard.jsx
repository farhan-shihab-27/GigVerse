// src/pages/Leaderboard.jsx — PVP Leaderboard (English UI, API-Wired)
import { useState, useEffect } from 'react';
import { Trophy, Zap, Star, Medal, Crown, TrendingUp, Loader2, AlertCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { userAPI } from '../lib/api';

const RANK_STYLES = {
  1: { bg: 'bg-gradient-to-br from-amber-400 to-yellow-500', label: '🥇' },
  2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-400', label: '🥈' },
  3: { bg: 'bg-gradient-to-br from-amber-600 to-amber-700', label: '🥉' },
};

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchLeaderboard(); }, []);
  const fetchLeaderboard = async () => {
    setLoading(true); setError('');
    try { const res = await userAPI.getLeaderboard(100); setUsers(res.data.data || []); }
    catch { setError('Failed to load leaderboard.'); }
    finally { setLoading(false); }
  };

  if (loading) return (<div className="min-h-[70vh] flex items-center justify-center"><div className="flex flex-col items-center gap-3 animate-pulse-soft"><Loader2 size={36} className="text-brand-500 animate-spin" /><p className="text-gray-400 text-sm">Loading leaderboard…</p></div></div>);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4"><TrendingUp size={13} /> Top Contributors</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">PVP <span className="text-gradient">Leaderboard</span></h1>
          <p className="text-gray-400 text-sm">Top 100 contributors — ranked by Peer Value Points (PVP)</p>
        </div>
        {error && (<div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>)}

        {/* TOP 3 PODIUM */}
        {users.length >= 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[users[1], users[0], users[2]].map((user, idx) => {
              const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const style = RANK_STYLES[rank];
              const initials = user.Name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const isFirst = rank === 1;
              return (
                <div key={user.UserID} className={`card p-6 text-center relative overflow-hidden hover:-translate-y-1 transition-all duration-300 ${isFirst ? 'sm:order-2 ring-2 ring-brand-200 shadow-brand' : idx === 0 ? 'sm:order-1' : 'sm:order-3'}`}>
                  <div className={`w-10 h-10 ${style.bg} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg`}><span className="text-lg">{style.label}</span></div>
                  <Link to={`/profile/${user.UserID}`} className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-xl font-extrabold shadow-md mb-3 hover:opacity-90 transition-opacity ${isFirst ? 'bg-brand-gradient text-white' : 'bg-gray-100 text-gray-600'}`}>{user.ProfilePicUrl ? <img src={user.ProfilePicUrl} alt={user.Name} className="w-full h-full rounded-2xl object-cover" /> : initials}</Link>
                  <Link to={`/profile/${user.UserID}`} className="font-bold text-gray-900 text-sm mb-0.5 hover:text-brand-600 transition-colors block">{user.Name}</Link>
                  <p className="text-[10px] text-gray-400 mb-3">{user.DeptName}</p>
                  <div className="flex items-center justify-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-xs font-bold mx-auto w-fit"><Zap size={12} className="fill-brand-500" />{user.PVP_Points} Points</div>
                  {user.AverageRating > 0 && <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500"><Star size={11} className="text-amber-400 fill-amber-400" />{Number(user.AverageRating).toFixed(1)}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-1">Rank</div><div className="col-span-5 sm:col-span-4">Name</div><div className="col-span-3 hidden sm:block">Department</div><div className="col-span-3 sm:col-span-2 text-center">Points</div><div className="col-span-3 sm:col-span-2 text-center">Rating</div>
          </div>
          {users.length === 0 ? (<div className="px-6 py-12 text-center"><Users size={36} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">No data available.</p></div>) : (
            users.map((user, i) => {
              const rank = i + 1; const initials = user.Name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); const isTop3 = rank <= 3;
              return (
                <div key={user.UserID} className={`grid grid-cols-12 gap-2 px-6 py-3.5 items-center border-b border-gray-50 hover:bg-brand-50/30 transition-colors duration-150 ${isTop3 ? 'bg-brand-50/20' : ''}`}>
                  <div className="col-span-1">{isTop3 ? <span className="text-lg">{RANK_STYLES[rank]?.label}</span> : <span className="text-sm font-bold text-gray-400">#{rank}</span>}</div>
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                    <Link to={`/profile/${user.UserID}`} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 hover:opacity-90 transition-opacity ${isTop3 ? 'bg-brand-gradient text-white' : 'bg-gray-100 text-gray-600'}`}>{user.ProfilePicUrl ? <img src={user.ProfilePicUrl} alt={user.Name} className="w-full h-full rounded-lg object-cover" /> : initials}</Link>
                    <div className="min-w-0"><Link to={`/profile/${user.UserID}`} className="text-sm font-semibold text-gray-900 truncate hover:text-brand-600 transition-colors block">{user.Name}</Link><p className="text-[10px] text-gray-400 truncate">{user.RoleName}</p></div>
                  </div>
                  <div className="col-span-3 hidden sm:block"><span className="text-xs text-gray-500">{user.DeptName}</span></div>
                  <div className="col-span-3 sm:col-span-2 text-center"><span className={`inline-flex items-center gap-1 text-xs font-bold ${isTop3 ? 'text-brand-600' : 'text-gray-700'}`}><Zap size={11} className={isTop3 ? 'fill-brand-500 text-brand-500' : 'text-gray-400'} />{user.PVP_Points}</span></div>
                  <div className="col-span-3 sm:col-span-2 text-center"><span className="inline-flex items-center gap-1 text-xs text-gray-600"><Star size={11} className="text-amber-400 fill-amber-400" />{Number(user.AverageRating).toFixed(1)}</span></div>
                </div>
              );
            })
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">PVP Points are earned through successful orders and client reviews.</p>
      </div>
    </main>
  );
}
