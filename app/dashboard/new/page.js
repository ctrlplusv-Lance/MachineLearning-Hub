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
    if (!title.trim() || !content.trim()) return;
    
    setLoading(true);
    
    try {
      // 1. Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("You must be logged in to publish!");
        router.push('/auth');
        return;
      }

      // 2. Insert into the database 
      // Ensuring author_id matches your specific table schema seen in Supabase
      const { error } = await supabase
        .from('articles')
        .insert([{ 
          title: title.trim(), 
          content: content.trim(), 
          author_id: user.id 
        }]);

      if (error) {
        console.error("Publishing error:", error.message);
        alert("Error publishing: " + error.message);
      } else {
        // 3. Success! 
        router.push('/dashboard');
        router.refresh(); 
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-50 rounded-full"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Create New Article</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
            <input 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="e.g., Understanding Neural Networks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl h-64 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="Deep dive into your machine learning topic..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white transition shadow-lg ${
              loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing...
              </span>
            ) : "Publish Article"}
          </button>
        </form>
      </div>
    </div>
  );
}