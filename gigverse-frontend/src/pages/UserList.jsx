import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Zap, Loader2, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

export default function UserList() {
  const [searchParams] = useSearchParams();
  const skill = searchParams.get('skill') || '';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true); setError('');
      try {
        const res = await api.get(`/users/by-skill?skill=${encodeURIComponent(skill)}`);
        setUsers(res.data.data || []);
      } catch (err) {
        setError('Failed to load users for this category.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [skill]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <Link to="/home" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors"><ArrowLeft size={16} /> Back to Categories</Link>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            {skill ? (
              <>Search Results for <span className="text-gradient">"{skill}"</span></>
            ) : (
              <>Top Campus <span className="text-gradient">Talent</span></>
            )}
          </h1>
          <p className="text-gray-400 text-sm">Find top talent in the UIU community</p>
        </div>
        
        {error && (<div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>)}

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center"><div className="flex flex-col items-center gap-3 animate-pulse-soft"><Loader2 size={36} className="text-brand-500 animate-spin" /><p className="text-gray-400 text-sm">Loading users…</p></div></div>
        ) : (
          <div className="card overflow-hidden shadow-brand">
            <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-3">Name</div>
              <div className="col-span-5 sm:col-span-6">Skills</div>
              <div className="col-span-3 text-center">PVP Points</div>
            </div>
            
            {users.length === 0 ? (
              <div className="px-6 py-12 text-center"><Users size={36} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">No contributors found for this skill.</p></div>
            ) : (
              users.map((user) => {
                const initials = user.Name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={user.UserID} className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-b border-gray-50 hover:bg-brand-50/30 transition-colors duration-150">
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                        {user.ProfilePicUrl ? <img src={user.ProfilePicUrl} alt={user.Name} className="w-full h-full rounded-xl object-cover" /> : initials}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/profile/${user.UserID}`} className="text-sm font-semibold text-gray-900 truncate hover:text-brand-600 transition-colors block">{user.Name}</Link>
                        <p className="text-[10px] text-gray-400 truncate">{user.RoleName} • {user.DeptName}</p>
                      </div>
                    </div>
                    <div className="col-span-5 sm:col-span-6 flex flex-wrap gap-1.5 items-center">
                      {user.Skills?.slice(0, 3).map((s, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">{s}</span>
                      ))}
                      {user.Skills?.length > 3 && <span className="text-[10px] text-gray-400">+{user.Skills.length - 3}</span>}
                    </div>
                    <div className="col-span-3 text-center flex flex-col items-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full"><Zap size={11} className="fill-brand-500" />{user.PVP_Points}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}
