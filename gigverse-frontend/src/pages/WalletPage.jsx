// src/pages/WalletPage.jsx — PVP & Escrow Wallet Overview
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Zap, ArrowLeft, ShieldCheck, TrendingUp, Clock, Lock } from 'lucide-react';
import { userAPI } from '../lib/api';

export default function WalletPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getMyProfile()
      .then(r => setProfile(r?.data?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pvp    = profile?.PVP_Points ?? 0;
  const wallet = Number(profile?.WalletBalance || 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">My Wallet</h1>
            <p className="text-xs text-gray-400 mt-0.5">PVP Points &amp; Escrow Earnings</p>
          </div>
          <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide">
            Coming Soon
          </span>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* PVP Points */}
          <div className="bg-gradient-to-br from-brand-500 to-orange-500 rounded-3xl p-6 shadow-brand text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Zap size={20} className="text-white fill-white" />
              </div>
              {loading
                ? <div className="h-9 w-24 bg-white/20 rounded-xl animate-pulse mb-1" />
                : <p className="text-4xl font-black">{pvp.toLocaleString()}</p>
              }
              <p className="text-sm font-semibold text-white/80 mt-1">PVP Points</p>
              <p className="text-xs text-white/60 mt-2">+4 pts per milestone approved</p>
            </div>
          </div>

          {/* Escrow Wallet */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-3xl p-6 shadow-lg shadow-emerald-200 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Wallet size={20} className="text-white" />
              </div>
              {loading
                ? <div className="h-9 w-28 bg-white/20 rounded-xl animate-pulse mb-1" />
                : <p className="text-4xl font-black">৳{wallet.toLocaleString()}</p>
              }
              <p className="text-sm font-semibold text-white/80 mt-1">Escrow Wallet</p>
              <p className="text-xs text-white/60 mt-2">Credited on milestone approvals</p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-500" /> How It Works
          </h2>
          {[
            { icon: TrendingUp, title: 'Earn PVP Points', desc: 'Gain +4 PVP per approved milestone, +15 for a full order completion. PVP boosts your leaderboard rank.', color: 'text-brand-500 bg-brand-50' },
            { icon: Wallet,     title: 'Escrow Wallet',  desc: 'When a client approves a milestone, the corresponding % of the order value is credited directly to your wallet.', color: 'text-emerald-500 bg-emerald-50' },
            { icon: Clock,      title: 'Full Withdrawals', desc: 'Full bKash / bank withdrawal support is coming soon. Your balance is safely tracked and never lost.', color: 'text-amber-500 bg-amber-50' },
            { icon: Lock,       title: 'Escrow Protection', desc: 'All funds are held in escrow until milestone approval — zero risk of non-payment for contributors.', color: 'text-blue-500 bg-blue-50' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="flex gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          <Link to="/orders" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl text-sm font-bold shadow-brand hover:shadow-brand-lg hover:-translate-y-0.5 transition-all">
            <ShieldCheck size={15} /> View My Orders
          </Link>
          <Link to="/leaderboard" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-brand-200 text-brand-600 hover:bg-brand-50 rounded-2xl text-sm font-bold transition-all">
            <TrendingUp size={15} /> Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
