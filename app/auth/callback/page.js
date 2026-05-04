'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Verifying your email and signing you in...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription;

    const verifySession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setMessage('Unable to verify session. Please sign in manually.');
          setLoading(false);
          return;
        }

        if (data?.session) {
          router.push('/dashboard');
          return;
        }

        setMessage('Email confirmed! Redirecting you now...');
        setLoading(false);

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            router.push('/dashboard');
          }
        });

        subscription = listener?.subscription;
      } catch (error) {
        setMessage('Verification completed, but automatic sign-in failed. Please log in.');
        setLoading(false);
      }
    };

    verifySession();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-xl border border-slate-50 text-center">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Email Verification</h1>
        <p className="text-slate-500 text-base leading-relaxed mb-6">{message}</p>
        {!loading && (
          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-600 transition-all"
          >
            Go to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
