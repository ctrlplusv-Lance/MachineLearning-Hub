'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import CommentModal from '@/app/components/CommentModal'; 
import NotificationBell from '@/app/components/NotificationBell';

const PAGE_SIZE = 5;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const router = useRouter();

  // Helper to format Date (e.g., Oct 24, 2023)
  const getFormattedDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper to format Time (e.g., 02:30 PM)
  const getFormattedTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadData = useCallback(async (userId, page = 0) => {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: articleData, error: articleError, count } = await supabase
        .from('articles')
        .select('*, profiles (username, avatar_url), reactions (reaction_type, user_id)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (articleError) throw articleError;

      const formattedArticles = articleData.map(article => ({
        ...article,
        like_count: article.reactions?.filter(r => r.reaction_type === 'like').length || 0,
      }));

      setArticles(formattedArticles);
      setTotalCount(count || 0);

      const { data: topData } = await supabase.from('articles').select('*, reactions(reaction_type)').limit(5);
      const sortedTop = (topData || [])
        .map(a => ({ ...a, like_count: a.reactions?.filter(r => r.reaction_type === 'like').length || 0 }))
        .sort((a, b) => b.like_count - a.like_count);
      setTopArticles(sortedTop);

      if (userId) {
        const { data: pData } = await supabase.from('profiles').select('username, avatar_url').eq('id', userId).single();
        setUserProfile(pData);
      }
    } catch (err) {
      console.error("Sync Error:", err.message);
    }
  }, []);

  useEffect(() => {
    const setup = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/auth'); return; }
      setUser(authUser);
      await loadData(authUser.id, currentPage);
      setLoading(false);
    };
    setup();

    const channel = supabase.channel('realtime-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadData(user?.id, currentPage))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => loadData(user?.id, currentPage))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router, currentPage, user?.id, loadData]);

  const handleReaction = async (articleId) => {
    if (!user) return;
    const article = articles.find(a => a.id === articleId);
    const hasLiked = article?.reactions?.find(r => r.user_id === user?.id && r.reaction_type === 'like');
    
    if (hasLiked) {
      await supabase.from('reactions').delete().match({ user_id: user.id, article_id: articleId, reaction_type: 'like' });
    } else {
      await supabase.from('reactions').upsert({ user_id: user.id, article_id: articleId, reaction_type: 'like' }, { onConflict: 'user_id, article_id' });
    }
    loadData(user.id, currentPage);
  };

  const handleShare = async (article) => {
    const shareData = {
      title: article.title,
      text: `Check out this discovery: ${article.title}`,
      url: `${window.location.origin}/dashboard/article/${article.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert("Link copied to clipboard!");
    }
  };

  const handleDelete = async (articleId) => {
    if (!confirm("Are you sure you want to delete this signal?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (error) {
      alert("Error: " + error.message);
    } else {
      loadData(user?.id, currentPage);
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-24">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">Art<span className="text-blue-600">Hub</span></h1>
          <div className="flex items-center gap-4">
            <NotificationBell user={user} />
            <Link href="/dashboard/profile" className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-white shadow-md">
              <img src={userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.username || 'U'}`} className="w-full h-full object-cover" alt="P" />
            </Link>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-[9px] font-black uppercase text-slate-400 ml-2">Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2 space-y-10">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative group flex-1 w-full">
              <input 
                type="text"
                placeholder="Search ArtHub..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-100 py-5 px-14 rounded-[2rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 outline-none shadow-sm shadow-slate-200/50"
              />
              <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
            </div>
            
            <Link 
              href="/dashboard/publish" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 whitespace-nowrap"
            >
              + Publish Signal
            </Link>
          </div>
          
          {filteredArticles.map((article) => {
            const hasLiked = article.reactions?.find(r => r.user_id === user?.id && r.reaction_type === 'like');
            const isAuthor = user?.id === article.user_id;

            return (
              <article key={article.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 transition-all hover:shadow-2xl relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                      <img src={article.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${article.profiles?.username}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">@{article.profiles?.username}</p>
                      {/* FIXED TIMESTAMP: Full Date and Time */}
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                        {getFormattedDate(article.created_at)} • {getFormattedTime(article.created_at)}
                      </p>
                    </div>
                  </div>

                  {isAuthor && (
                    <button 
                      onClick={() => handleDelete(article.id)}
                      className="p-3 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-2xl transition-all shadow-sm"
                      title="Delete Signal"
                    >
                      🗑
                    </button>
                  )}
                </div>

                <Link href={`/dashboard/article/${article.id}`} className="block group">
                  <h3 className="text-3xl font-black text-slate-900 mb-6 leading-tight group-hover:text-blue-600 transition-colors tracking-tight">{article.title}</h3>
                  {article.image_url && (
                    <div className="rounded-[2.5rem] overflow-hidden mb-6 border border-slate-50 shadow-inner">
                      <img src={article.image_url} className="w-full h-auto object-cover max-h-96" alt="" />
                    </div>
                  )}
                  <p className="text-slate-500 line-clamp-2 font-medium mb-8 leading-relaxed opacity-80">{article.content}</p>
                </Link>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex gap-3">
                    <button onClick={() => handleReaction(article.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${hasLiked ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-blue-50'}`}>
                      🔥 {article.like_count} Agree
                    </button>
                    
                    <button 
                      onClick={() => handleShare(article)} 
                      className="bg-slate-50 text-slate-400 hover:bg-blue-50 px-4 py-3 rounded-2xl transition-all"
                      title="Share Signal"
                    >
                      ↗
                    </button>
                  </div>
                  
                  <button onClick={() => setActiveArticle(article)} className="bg-slate-900 text-white hover:bg-blue-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-slate-200">💬 Discuss</button>
                </div>
              </article>
            );
          })}

          <div className="flex items-center justify-center gap-2 py-10">
            {[...Array(Math.ceil(totalCount / PAGE_SIZE))].map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)} className={`w-10 h-10 rounded-xl font-black text-[11px] transition-all ${currentPage === i ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 sticky top-28 shadow-xl shadow-slate-200/50">
            <h2 className="text-[10px] font-black mb-10 uppercase tracking-[0.2em] text-slate-300">Trending Discoveries</h2>
            <div className="space-y-10">
              {topArticles.map((item, index) => (
                <Link key={item.id} href={`/dashboard/article/${item.id}`} className="flex items-start gap-5 group">
                  <span className="text-slate-100 font-black text-4xl leading-none group-hover:text-blue-100">{(index + 1).toString().padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 line-clamp-2 leading-tight uppercase tracking-tight">{item.title}</p>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{item.like_count} agrees</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </main>
      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}