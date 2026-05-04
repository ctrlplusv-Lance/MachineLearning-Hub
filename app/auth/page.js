'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Use a public base URL when available; otherwise use the current browser origin.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://machinelearnhub.vercel.app';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      }
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('✅ Check your inbox! We sent a verification link.');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setMessage("⚠️ Please confirm your email before logging in.");
      } else {
        setMessage(`Error: ${error.message}`);
      }
    } else {
      setMessage('Login successful! Entering dashboard...');
      router.push('/dashboard'); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-slate-50">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 text-2xl">
            🚀
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">ArtHub Access</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Machine Learning Discovery Hub</p>
        </div>
        
        <form className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="engineer@domain.com"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all text-slate-700 font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all text-slate-700 font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="button"
              onClick={handleLogin} 
              disabled={loading}
              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <button 
              type="button"
              onClick={handleSignUp} 
              disabled={loading}
              className="w-full bg-white text-slate-900 border-2 border-slate-100 p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Create Account
            </button>
          </div>
          
          {message && (
            <div className={`mt-6 p-4 text-center text-[11px] font-black uppercase tracking-tight rounded-2xl animate-in fade-in slide-in-from-bottom-2 ${
              message.includes('Error') || message.includes('⚠️') ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              {message}
            </div>
          )}
        </form>
        
        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-slate-300 font-bold text-[9px] uppercase tracking-widest">
            Protocol maintained by <span className="text-slate-900">Lance Ian E. Moquerio</span>
          </p>
        </div>
      </div>
    </div>
  );
}