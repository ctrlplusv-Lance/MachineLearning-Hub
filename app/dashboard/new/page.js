"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewArticle() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
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

      let publicUrl = null;

      // 2. Handle Image Upload if a file exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw new Error("Image upload failed: " + uploadError.message);
        }

        // Get the Public URL for the database record
        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(filePath);
        
        publicUrl = urlData.publicUrl;
      }

      // 3. Insert into the database 
      // FIXED: Using 'author_id' to match your database constraint
      const { error } = await supabase
        .from('articles')
        .insert([{ 
          title: title.trim(), 
          content: content.trim(), 
          author_id: user.id, // Corrected from user_id
          image_url: publicUrl 
        }]);

      if (error) {
        // If you still see an RLS error here, run the SQL INSERT policy provided earlier
        console.error("Publishing error:", error.message);
        alert("Error publishing: " + error.message);
      } else {
        router.push('/dashboard');
        router.refresh(); 
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(err.message || "An unexpected error occurred.");
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Cover Image (Optional)</label>
            <input 
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full p-2 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Content</label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl h-64 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="Deep dive into your topic..."
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
            {loading ? "Publishing..." : "Publish Article"}
          </button>
        </form>
      </div>
    </div>
  );
}