"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewArticle() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Get current user and check if they exist
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("You must be logged in to publish!");
      router.push('/auth');
      return;
    }

    // 2. Insert into the database
    const { error } = await supabase
      .from('articles')
      .insert([{ 
        title, 
        content, 
        author_id: user.id 
      }]);

    if (error) {
      console.error("Error publishing:", error.message);
      alert("Error: " + error.message);
    } else {
      // 3. Success! Go back to dashboard
      router.push('/dashboard');
      router.refresh(); // Forces Next.js to fetch new data for the feed
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-slate-400 hover:text-slate-600 transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Create New Article</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
            <input 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="e.g., Understanding Neural Networks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl h-64 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
              placeholder="Deep dive into your machine learning topic..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white transition shadow-lg ${
              loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {loading ? "Publishing..." : "Publish Article"}
          </button>
        </form>
      </div>
    </div>
  );
}