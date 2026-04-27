'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (data) setUsername(data.username || '');
      setLoading(false);
    };

    getProfile();
  }, [router]);

  const updateProfile = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: username, updated_at: new Date() });

    if (error) alert(error.message);
    else alert('Profile updated!');
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-blue-900 font-bold">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 mb-6">User Profile</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
            <input 
              type="text" 
              disabled 
              value={user?.email} 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="Enter username..."
            />
          </div>

          <button 
            onClick={updateProfile}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition active:scale-95"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full text-slate-400 text-sm font-bold hover:text-slate-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}