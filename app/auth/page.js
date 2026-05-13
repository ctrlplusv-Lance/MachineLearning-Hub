'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 1. STATE FOR PASSWORD VISIBILITY
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // 2. VALIDATE PASSWORD LENGTH (8 CHARACTERS MINIMUM)
    if (password.length < 8) {
      setMessage('⚠️ Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (!username) {
          setMessage('⚠️ Please choose a username.');
          setLoading(false);
          return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${baseUrl}/auth/callback`,
            data: { username: username }
          }
        });

        if (authError) throw authError;

        if (data?.user) {
          // Using .upsert() as previously fixed to avoid duplicate key errors
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([
              { 
                id: data.user.id, 
                username: username, 
                avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
                bio: "" // Matches schema
              }
            ], { onConflict: 'id' });

          if (profileError) {
            console.error("Database Error:", profileError);
            setMessage('⚠️ Account created, but profile setup failed.');
          } else {
            setMessage('✅ Success! Please check your email to verify your account.');
            setEmail('');
            setPassword('');
            setUsername('');
          }
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (loginError) {
          if (loginError.message.includes("Email not confirmed")) {
            setMessage("⚠️ Please confirm your email first.");
          } else {
            throw loginError;
          }
        } else if (data?.user) {
          setMessage('Success! Entering Dashboard...');
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl w-full max-w-md border border-slate-50 transition-all">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 text-2xl">
            {isSignUp ? '✨' : '🚀'}
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
            {isSignUp ? 'Join the ML Discovery Hub' : 'Enter the Protocol'}
          </p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input
                type="text"
                placeholder="johndoe"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-slate-700 font-medium"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="engineer@domain.com"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-slate-700 font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD FIELD WITH TOGGLE */}
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input
              // Toggle between "password" and "text"
              type={showPassword ? "text" : "password"} 
              placeholder="Min. 8 characters"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-slate-700 font-medium pr-16"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* TOGGLE BUTTON */}
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 bottom-[14px] text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:text-blue-700 transition-colors bg-white px-2 py-1 rounded-lg"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 shadow-lg shadow-slate-200"
          >
            {loading ? 'Processing...' : isSignUp ? 'Register Account' : 'Sign In'}
          </button>

          {message && (
            <div className={`mt-4 p-4 text-center text-[10px] font-black uppercase rounded-2xl animate-in fade-in zoom-in duration-200 ${
              message.includes('Error') || message.includes('⚠️') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
            }`}>
              {message}
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <button 
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}