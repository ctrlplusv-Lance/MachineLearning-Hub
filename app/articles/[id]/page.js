'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ArticleDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [user, setUser] = useState(null);
  const [userReaction, setUserReaction] = useState(null);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [loading, setLoading] = useState(true);

  // --- HELPER: Relative Time for ArtHub ---
  const getArtHubTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffInDays === 0) return `TODAY AT ${timePart}`;
    if (diffInDays === 1) return `YESTERDAY AT ${timePart}`;
    return `${date.toLocaleDateString()} AT ${timePart}`;
  };

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const { data, error } = await supabase.from('articles')
      .select('*, profiles(username, avatar_url), comments(*, profiles(username, avatar_url))')
      .eq('id', id)
      .single();
      
    if (error || !data) {
      router.push('/dashboard');
      return;
    }
    setArticle(data);

    const { data: reacts } = await supabase.from('reactions')
      .select('*')
      .eq('article_id', id);

    setCounts({
      likes: reacts?.filter(r => r.reaction_type === 'like').length || 0,
      dislikes: reacts?.filter(r => r.reaction_type === 'dislike').length || 0
    });
    
    if (authUser) {
      setUserReaction(reacts?.find(r => r.user_id === authUser.id)?.reaction_type || null);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchData();

      const channel = supabase.channel(`article-realtime-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `article_id=eq.${id}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `article_id=eq.${id}` }, () => fetchData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [id, fetchData]);

  const handleReaction = async (type) => {
    if (!user) return alert("Please sign in to react!");
    
    if (userReaction === type) {
      await supabase.from('reactions').delete().match({ article_id: id, user_id: user.id });
    } else {
      await supabase.from('reactions').upsert({ 
        article_id: id, 
        user_id: user.id, 
        reaction_type: type 
      }, { onConflict: 'user_id, article_id' });
    }
    fetchData();
  };

  const handleDeleteArticle = async () => {
    if (!confirm("This will permanently remove this discovery from the Hub. Proceed?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else router.push('/dashboard');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: article.title, 
          text: `Check out this ArtHub discovery by @${article.profiles?.username}`,
          url 
        });
      } catch (err) { console.log(err); }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link secured to clipboard! ✨");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const isOwner = user?.id === article.author_id;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 font-sans selection:bg-blue-100">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-10">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm group-hover:border-blue-300 transition-all">
              <span className="text-xs group-hover:-translate-x-1 transition-transform">←</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-600">Return to Feed</span>
          </Link>

          {isOwner && (
            <button onClick={handleDeleteArticle} className="text-slate-300 hover:text-red-500 transition-colors text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <span>Delete Signal</span>
              <span className="text-lg">🗑️</span>
            </button>
          )}
        </div>

        <article className="bg-white rounded-[3.5rem] border border-slate-100 p-8 md:p-16 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-[100px] pointer-events-none" />

          {/* Author Header */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg shadow-blue-100 bg-slate-100">
              <img 
                src={article.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${article.profiles?.username}&background=2563eb&color=fff`} 
                className="w-full h-full object-cover" 
                alt=""
              />
            </div>
            <div>
              <p className="font-black text-lg text-slate-900 tracking-tight">@{article.profiles?.username}</p>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">
                {getArtHubTimestamp(article.created_at)}
              </p>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-10 leading-[0.9] text-slate-900 tracking-tighter">
            {article.title}
          </h1>
          
          {article.image_url && (
            <div className="rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner mb-12">
              <img 
                src={article.image_url} 
                className="w-full h-auto object-cover max-h-[600px] hover:scale-[1.01] transition-transform duration-700" 
                alt="Discovery Visual"
              />
            </div>
          )}

          <p className="text-xl text-slate-600 leading-relaxed mb-16 whitespace-pre-wrap font-medium opacity-90">
            {article.content}
          </p>

          {/* Interaction Bar */}
          <div className="flex flex-wrap gap-4 py-8 border-t border-slate-50">
            <button 
              onClick={() => handleReaction('like')} 
              className={`px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 ${
                userReaction === 'like' 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100'
              }`}
            >
              🔥 {counts.likes} Agree
            </button>

            <button 
              onClick={handleShare} 
              className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all hover:bg-blue-600 shadow-xl shadow-slate-200 flex items-center gap-3"
            >
              🔗 Share Signal
            </button>
          </div>
        </article>

        {/* Discussion Section */}
        <section className="mt-16 px-4">
          <div className="flex items-center gap-4 mb-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Community Discussion
            </h3>
            <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
              {article.comments?.length || 0}
            </span>
          </div>

          <div className="space-y-6">
            {article.comments && article.comments.length > 0 ? (
              article.comments.map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:border-blue-100 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-blue-600 uppercase">
                        {c.profiles?.username?.charAt(0)}
                      </div>
                      <p className="text-[11px] font-black text-slate-900 uppercase">
                        @{c.profiles?.username} • <span className="text-slate-300 font-bold ml-1">{getArtHubTimestamp(c.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium pl-11">{c.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em]">Silence is golden. Start the signal.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}