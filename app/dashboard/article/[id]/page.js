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
      // Get the current logged-in user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Fetch the article with avatar_url included
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

      // REAL-TIME: Listen for updates to this article
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

  // ENHANCED SHARE LOGIC (Mobile + Desktop)
  const handleShare = async () => {
    const shareData = {
      title: article.title,
      text: `Check out this discovery by @${article.profiles?.username}:`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard! ✨");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-900 font-black animate-pulse uppercase tracking-widest text-[10px]">Syncing Discovery...</p>
      </div>
    </div>
  );

  if (!article) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 pb-20 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => router.push('/dashboard')} 
          className="mb-8 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition flex items-center gap-2 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Hub
        </button>

        {/* Main Content */}
        <article className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {/* Profile Avatar Integration */}
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm flex-shrink-0">
                {article.profiles?.avatar_url ? (
                  <img src={article.profiles.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-600 font-black text-lg bg-blue-50">
                    {article.profiles?.username?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                  @{article.profiles?.username || 'anonymous'}
                </p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                  {article.created_at ? new Date(article.created_at).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                  }) : 'Recent'} • Public Discovery
                </p>
              </div>
            </div>
            
            <span className="hidden sm:block bg-blue-50 text-blue-600 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.1em]">
              Verified Discovery
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
            {article.title}
          </h1>

          {article.image_url && (
            <div className="mb-10 overflow-hidden rounded-[2rem] border border-slate-100 shadow-xl bg-slate-50 group">
              <img 
                src={article.image_url} 
                alt={article.title} 
                className="w-full h-auto max-h-[700px] object-contain mx-auto transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
          )}

          <div className="prose prose-slate max-w-none">
            <p className="text-base md:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {article.content}
            </p>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4">
             <button 
              onClick={handleLike}
              disabled={isLiking}
              className={`flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border border-transparent hover:border-orange-100 ${isLiking ? 'opacity-50' : ''}`}
             >
                🔥 {article.helpful_count > 0 ? article.helpful_count : ''} Helpful Discovery
             </button>
             
             <button 
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border border-transparent hover:border-blue-100"
             >
                🔗 Share Link
             </button>
          </div>

          <hr className="my-10 border-slate-50" />

          {/* STEP 2 INTEGRATION: The Comment Section */}
          <CommentSection articleId={id} user={user} />

        </article>

        <div className="mt-10 text-center">
          <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.2em] mb-4">End of Discovery</p>
          <div className="w-1 h-1 bg-slate-200 rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
}