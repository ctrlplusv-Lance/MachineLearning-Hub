'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/auth'); // Redirect back if not logged in
      else setUser(user);
    };
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // Go back to landing page after logout
  };

  if (!user) return <p className="p-10 text-center">Loading...</p>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50">
      <h1 className="text-3xl font-bold mb-4 text-blue-900">Welcome to Machine Learning Hub!</h1>
      <p className="mb-8 text-gray-700">Logged in as: <span className="font-semibold">{user.email}</span></p>
      <button 
        onClick={handleLogout}
        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
      >
        Logout
      </button>
    </div>
  );
}