"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewArticle() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

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
      // 1. Get the current session user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Session expired. Please log in again.");
        router.push('/auth');
        return;
      }

      let publicUrl = null;

      // 2. Handle Image Upload (matching your schema image_url column)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `articles/${fileName}`; 
        
        const { error: uploadError } = await supabase.storage
          .from('article-images') // Ensure this bucket exists in your Supabase Dashboard
          .upload(filePath, imageFile, {
            contentType: imageFile.type,
            upsert: true
          });

        if (uploadError) throw new Error("Storage Upload Failed: " + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(filePath);
        
        publicUrl = urlData.publicUrl;
      }

      // 3. Insert Article
      // Matches author_id constraint and image_url column
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
      // Logic: Notify the user themselves that their post is live
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: user.id, // Recipient
            actor_usernames: user.user_metadata?.username || 'Anonymous', // Use real username
            article_id: newArticle.id,
            type: 'author_success'
          }
        ]);

      if (notifError) console.error("Notification Sync Error:", notifError);

      // 5. Cleanup and Redirect
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
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans">
      <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-50">
        <div className="flex items-center gap-6 mb-10">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-2xl font-black text-sm"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Broadcast</h1>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">New Discovery Protocol</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Headline</label>
            <input 
              className="w-full p-5 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition font-bold text-slate-900 placeholder:text-slate-300"
              placeholder="The future of Neural Networks..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Visual Data (Optional)</label>
            {!previewUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-100 rounded-[2.5rem] cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-12 h-12 bg-white shadow-md rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="text-xl">🖼️</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Click to upload imagery</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={loading} />
              </label>
            ) : (
              <div className="relative group rounded-[2.5rem] overflow-hidden border-4 border-white shadow-lg">
                <img src={previewUrl} alt="Preview" className="w-full h-72 object-cover" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                  <button 
                    type="button"
                    onClick={() => { setImageFile(null); setPreviewUrl(null); }}
                    className="bg-white px-8 py-3 rounded-2xl text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"
                  >
                    Remove Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Discovery Brief</label>
            <textarea 
              className="w-full p-6 bg-slate-50 border-none rounded-[2rem] h-64 focus:ring-4 focus:ring-blue-500/5 outline-none transition resize-none font-medium leading-relaxed text-slate-700 placeholder:text-slate-300"
              placeholder="Synthesize your findings here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-6 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] text-white transition-all shadow-xl active:scale-95 ${
              loading ? 'bg-slate-200 animate-pulse cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-blue-600 shadow-blue-100'
            }`}
          >
            {loading ? "Transmitting..." : "Initialize Broadcast"}
          </button>
        </form>
      </div>
    </div>
  );
}