'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import CommentModal from '../components/CommentModal'; 
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const router = useRouter();

  const loadData = async () => {
    try {
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*, profiles (username), reactions (reaction_type, user_id)')
        .order('created_at', { ascending: false });

      if (articleError) throw articleError;

      const formattedArticles = articleData.map(article => ({
        ...article,
        like_count: article.reactions?.filter(r => r.reaction_type === 'like').length || 0,
        dislike_count: article.reactions?.filter(r => r.reaction_type === 'dislike').length || 0
      }));
      setArticles(formattedArticles);

      const { data: topData } = await supabase.from('top_articles').select('*');
      setTopArticles(topData || []);
    } catch (err) {
      console.error("Sync Error:", err.message);
    }
  };

  useEffect(() => {
    const setup = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { 
        router.push('/auth'); 
        return; 
      }
      setUser(authUser);
      await loadData();
      setLoading(false);
    };
    setup();

    const channel = supabase.channel('realtime-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  // Logic to filter articles based on search query
  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReaction = async (articleId, type) => {
    if (!user) return;
    const article = articles.find(a => a.id === articleId);
    const current = article?.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
    
    if (current === type) {
      await supabase.from('reactions').delete().match({ user_id: user.id, article_id: articleId });
    } else {
      await supabase.from('reactions').upsert({ 
        user_id: user.id, 
        article_id: articleId, 
        reaction_type: type 
      }, { onConflict: 'user_id, article_id' });
    }
    loadData();
  };

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} AT ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleDeleteArticle = async (articleId) => {
    if (!confirm("Delete this discovery?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (error) alert("Error deleting: " + error.message);
    else loadData();
  };

  const handleShare = async (article) => {
    const url = `${window.location.origin}/dashboard/article/${article.id}`;
    if (navigator.share) {
      await navigator.share({ title: article.title, url });
    } else { 
      await navigator.clipboard.writeText(url); 
      alert("Link copied!"); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600 uppercase text-xs tracking-widest">Syncing Hub...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-black text-blue-900 cursor-pointer" onClick={() => router.push('/dashboard')}>Article Hub</h1>
        
        <div className="flex items-center gap-3">
          <NotificationBell user={user} />
          
          <Link 
            href="/dashboard/profile"
            className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100 active:scale-95"
          >
            👤 @{user?.user_metadata?.username || user?.email?.split('@')[0]}
          </Link>

          <button onClick={() => router.push('/dashboard/new')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100">+ New Post</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-slate-400 hover:text-red-500 text-sm font-black transition-colors px-2">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Latest Discoveries</h2>
            
            {/* SEARCH BAR UI */}
            <div className="relative group flex-1 max-w-sm">
              <input 
                type="text"
                placeholder="Search discoveries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 py-2.5 px-10 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all group-hover:border-slate-300"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
            </div>
          </div>
          
          {filteredArticles.length === 0 ? (
            <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest mb-4">No results for "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')} 
                className="text-blue-600 text-xs font-black uppercase underline hover:text-blue-800 transition"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredArticles.map((article) => {
              const userReaction = article.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
              return (
                <article key={article.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 relative group transition-all hover:shadow-md hover:border-blue-100">
                  {user?.id === article.author_id && (
                    <button onClick={() => handleDeleteArticle(article.id)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors p-2 text-xl">🗑️</button>
                  )}
                  
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">PUBLISHED {formatTimestamp(article.created_at)}</span>
                  </div>

                  <div className="cursor-pointer" onClick={() => router.push(`/dashboard/article/${article.id}`)}>
                    <h3 className="text-2xl font-black group-hover:text-blue-700 mb-4 transition-colors leading-tight tracking-tight">{article.title}</h3>
                    {article.image_url && (
                      <div className="overflow-hidden rounded-3xl mb-4 border border-slate-50 shadow-inner">
                        <img src={article.image_url} className="w-full h-80 object-cover group-hover:scale-[1.02] transition-transform duration-500" alt="Preview" />
                      </div>
                    )}
                    <p className="text-slate-600 mb-6 leading-relaxed line-clamp-3 font-medium">{article.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                    <div className="flex gap-4">
                      <button onClick={() => handleReaction(article.id, 'like')} className={`flex items-center gap-1 text-xs font-black transition-all active:scale-90 ${userReaction === 'like' ? 'text-orange-500 scale-110' : 'text-slate-400 hover:text-orange-400'}`}>
                        🔥 {article.like_count}
                      </button>
                      <button onClick={() => handleReaction(article.id, 'dislike')} className={`flex items-center gap-1 text-xs font-black transition-all active:scale-90 ${userReaction === 'dislike' ? 'text-slate-900 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        👎 {article.dislike_count}
                      </button>
                      <button onClick={() => setActiveArticle(article)} className="text-slate-400 text-xs font-black hover:text-blue-600 transition-colors">💬 Comment</button>
                      <button onClick={() => handleShare(article)} className="text-slate-400 text-xs font-black hover:text-blue-600 transition-colors">🔗 Share</button>
                    </div>
                    <span className="text-[10px] font-black text-blue-600 italic bg-blue-50 px-3 py-1 rounded-full uppercase">@{article.profiles?.username || 'anonymous'}</span>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 sticky top-24 shadow-sm">
            <h2 className="text-lg font-black mb-6 uppercase tracking-widest flex items-center gap-2 text-slate-900">🔥 Trending</h2>
            <div className="space-y-6">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 cursor-pointer group" onClick={() => router.push(`/dashboard/article/${item.id}`)}>
                  <span className="text-blue-100 font-black text-3xl transition-colors group-hover:text-blue-200">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{item.title}</p>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.like_count} Helpful</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
      
      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}