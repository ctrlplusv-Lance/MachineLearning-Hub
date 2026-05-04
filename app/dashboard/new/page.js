"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewArticle() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // For the visual preview
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handle file selection and create a temporary preview URL
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Clean up the preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`; // Organized by user ID
        
        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(filePath, imageFile);

        if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(filePath);
        
        publicUrl = urlData.publicUrl;
      }

      // 3. Insert Article into 'articles' table
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

      // 4. Trigger Notifications
      const myUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
      
      const { error: notifError } = await supabase.from('notifications').insert([
        {
          user_id: null, 
          actor_usernames: [myUsername],
          article_id: newArticle.id,
          type: 'new_article'
        },
        {
          user_id: user.id, 
          actor_usernames: ['You'],
          article_id: newArticle.id,
          type: 'author_success'
        }
      ]);

      if (notifError) console.error("Notification Sync Error:", notifError);

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
          {/* TITLE INPUT */}
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

          {/* IMAGE UPLOAD & PREVIEW */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cover Image</label>
            
            {!previewUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📸</span>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Select a photo</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={loading} />
              </label>
            ) : (
              <div className="relative group rounded-3xl overflow-hidden border border-slate-200">
                <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
                <button 
                  type="button"
                  onClick={() => { setImageFile(null); setPreviewUrl(null); }}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-xl text-[10px] font-black text-red-500 shadow-xl hover:bg-red-50 transition-colors uppercase"
                >
                  Remove ×
                </button>
              </div>
            )}
          </div>

          {/* CONTENT TEXTAREA */}
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
              loading ? 'bg-slate-300 animate-pulse cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {loading ? "Publishing..." : "Publish Discovery"}
          </button>
        </form>
      </div>
    </div>
  );
}