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
      // 1. Authenticate the user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("You must be logged in to publish!");
        router.push('/auth');
        return;
      }

      let publicUrl = null;

      // 2. Handle Image Upload to Storage
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(fileName, imageFile);

        if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(fileName);
        
        publicUrl = urlData.publicUrl;
      }

      // 3. Insert Article into 'articles' table
      // Matches the 'author_id' column in your schema
      const { data: newArticle, error: articleError } = await supabase
        .from('articles')
        .insert([{ 
          title: title.trim(), 
          content: content.trim(), 
          author_id: user.id, 
          image_url: publicUrl 
        }])
        .select()
        .single();

      if (articleError) throw articleError;

      // 4. Trigger Global Notification
      // FIXED: Strictly removed 'message' to match your schema
      const myUsername = user.email ? user.email.split('@')[0] : 'User';
      
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: null, 
        actor_usernames: [myUsername], // Schema expects text array
        article_id: newArticle.id,
        type: 'new_article'
      });

      if (notifError) {
  console.error("Notification Sync Error:", notifError);
}

      router.push('/dashboard');
      router.refresh(); 

    } catch (err) {
      console.error("Publishing Error:", err.message);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-slate-400 hover:text-blue-600 transition p-2 hover:bg-blue-50 rounded-full font-black text-xs uppercase"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">New Discovery</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Article Title</label>
            <input 
              className="w-full p-4 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-slate-50 font-bold text-slate-900"
              placeholder="Give it a catchy name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cover Image</label>
            <input 
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full p-2 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Content</label>
            <textarea 
              className="w-full p-4 border border-slate-100 rounded-3xl h-64 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none bg-slate-50 font-medium leading-relaxed text-slate-800"
              placeholder="What did you discover today?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${
              loading ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? "Publishing..." : "Publish Discovery"}
          </button>
        </form>
      </div>
    </div>
  );
}