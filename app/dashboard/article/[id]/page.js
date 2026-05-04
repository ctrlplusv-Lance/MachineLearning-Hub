'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CommentSection from './CommentSection'; 

export default function ArticleView({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const id = params.id;
  
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          profiles:author_id (
            username,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Fetch Error:", error.message);
        router.push('/dashboard');
      } else {
        setArticle(data);
        window.scrollTo(0, 0); 
      }
      setLoading(false);
    };

    if (id) {
      fetchData();

      const channel = supabase.channel(`article-${id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'articles', 
          filter: `id=eq.${id}` 
        }, (payload) => {
          setArticle(prev => ({ ...prev, ...payload.new }));
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [id, router]);

  const handleLike = async () => {
    if (isLiking || !article) return;
    setIsLiking(true);
    
    const { error } = await supabase
      .from('articles')
      .update({ helpful_count: (article.helpful_count || 0) + 1 })
      .eq('id', id);

    if (error) console.error("Like error:", error.message);
    setIsLiking(false);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `Check out this discovery by @${article.profiles?.username}:`,
          url: shareUrl,
        });
      } catch (err) { console.log("Share failed", err); }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard! ✨");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-900 font-black uppercase tracking-[0.3em] text-[9px]">Syncing Discovery</p>
      </div>
    </div>
  );

  if (!article) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12 pb-24 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Editorial Navigation */}
        <button 
          onClick={() => router.push('/dashboard')} 
          className="mb-10 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group"
        >
          <span className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:-translate-x-1 transition-transform border border-slate-100 text-sm">←</span> 
          Return to Hub
        </button>

        <article className="bg-white rounded-[3rem] shadow-[0_20px_60px_-20px_rgba(15,23,42,0.05)] border border-slate-100 overflow-hidden">
          
          {/* Cover Image Integration */}
          {article.image_url && (
            <div className="w-full relative group">
              <img 
                src={article.image_url} 
                alt="" 
                className="w-full h-auto max-h-[600px] object-cover border-b border-slate-50"
              />
              <div className="absolute top-6 left-6">
                <span className="bg-white/90 backdrop-blur-md text-blue-600 text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl border border-white/50">
                   Visual Discovery
                </span>
              </div>
            </div>
          )}

          <div className="p-6 md:p-16">
            {/* Author Section */}
            <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white bg-slate-50 shadow-md">
                  {article.profiles?.avatar_url ? (
                    <img src={article.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-600 font-black text-xl bg-blue-50">
                      {article.profiles?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">@{article.profiles?.username || 'anonymous'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Post Published on {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-6xl font-black text-slate-900 mb-10 leading-[1.05] tracking-tight">
              {article.title}
            </h1>

            {/* Body Text */}
            <div className="prose prose-slate max-w-none">
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed whitespace-pre-wrap font-medium opacity-90">
                {article.content}
              </p>
            </div>
            
            {/* Actions Bar */}
            <div className="mt-16 flex flex-col sm:flex-row gap-4">
               <button 
                onClick={handleLike}
                disabled={isLiking}
                className="flex-1 flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-700 text-white px-8 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-orange-100 disabled:opacity-50"
               >
                 🔥 {article.helpful_count || 0} Helpful Signals
               </button>
               
               <button 
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-slate-200"
               >
                 🔗 Amplify Signal (Share)
               </button>
            </div>

            {/* Thread Section */}
            <div className="mt-16 bg-slate-50/50 rounded-[2.5rem] p-4 md:p-10 border border-slate-50">
              <CommentSection articleId={id} user={user} />
            </div>
          </div>
        </article>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4">
             <div className="w-10 h-[1px] bg-slate-200"></div>
             <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.4em]">Signal End</p>
             <div className="w-10 h-[1px] bg-slate-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}