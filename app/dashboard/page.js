'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CommentModal from '../components/CommentModal'; 

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); 
  const router = useRouter();

  const loadData = async () => {
    const { data: articleData, error } = await supabase
      .from('articles')
      .select(`
        *, 
        profiles (username),
        likes:likes(count),
        dislikes:dislikes(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading articles:", error);
      return;
    }

    const formattedArticles = articleData.map(article => ({
      ...article,
      like_count: article.likes[0]?.count || 0,
      dislike_count: article.dislikes[0]?.count || 0
    }));

    setArticles(formattedArticles);

    const { data: topData } = await supabase.from('top_articles').select('*');
    setTopArticles(topData || []);

    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setNotifications(notifData || []);
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

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dislikes' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => loadData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleLike = async (articleId) => {
    if (!user) return;
    const { error } = await supabase.from('likes').insert([{ user_id: user.id, article_id: articleId }]);
    if (error && error.code === '23505') {
      await supabase.from('likes').delete().match({ user_id: user.id, article_id: articleId });
    }
    loadData();
  };

  const handleDislike = async (articleId) => {
    if (!user) return;
    const { error } = await supabase.from('dislikes').insert([{ user_id: user.id, article_id: articleId }]);
    if (error && error.code === '23505') {
      await supabase.from('dislikes').delete().match({ user_id: user.id, article_id: articleId });
    }
    loadData();
  };

  const handleDelete = async (articleId) => {
    if (!confirm("Are you sure you want to delete your article?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (error) alert(error.message);
    else loadData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-blue-900 font-bold animate-pulse text-xl">Loading Hub...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <h1 className="text-xl font-black text-blue-900 tracking-tight">Article Hub</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/profile')} className="text-sm text-blue-600 font-bold hover:underline">
            @{user?.email?.split('@')[0]}
          </button>

          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 text-slate-500 hover:text-blue-600 transition">
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[60] overflow-hidden">
                <div className="p-4 border-b font-bold text-slate-800 bg-slate-50 flex justify-between">
                  <span>Notifications</span>
                  <button onClick={() => setNotifications([])} className="text-[10px] text-blue-600">Clear All</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No new updates</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => { router.push(`/dashboard/article/${n.article_id}`); setShowNotifs(false); }} className="p-4 border-b hover:bg-blue-50 cursor-pointer">
                        <p className="text-sm font-semibold text-slate-900">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => router.push('/dashboard/new')} className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 text-sm font-bold shadow-md">+ New Post</button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 text-sm font-bold">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Latest Discoveries</h2>
          {articles.map((article) => {
            const displayName = article.profiles?.username || article.profiles?.email?.split('@')[0] || 'anonymous';
            const isOwner = user?.id === article.user_id;
            
            // Format publication date
            const dateStr = new Date(article.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <article 
                key={article.id} 
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:border-blue-300 transition-all group relative cursor-pointer"
                onClick={() => router.push(`/dashboard/article/${article.id}`)}
              >
                {isOwner && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }} 
                    className="absolute top-6 right-6 text-slate-300 hover:text-red-500 z-10 text-xl" 
                    title="Delete your article"
                  >
                    🗑️
                  </button>
                )}
                
                <div className="flex flex-col gap-2 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Published on {dateStr}</span>
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
                    {article.title}
                  </h3>
                </div>

                {/* Display Image if it exists */}
                {article.image_url && (
                  <div className="mb-4 overflow-hidden rounded-2xl">
                    <img 
                      src={article.image_url} 
                      alt={article.title} 
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <p className="text-slate-600 line-clamp-2 leading-relaxed">{article.content}</p>
                
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black uppercase">{displayName.charAt(0)}</div>
                    <span className="text-slate-900 text-sm font-black">@{displayName}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <button onClick={(e) => { e.stopPropagation(); handleLike(article.id); }} className="flex items-center gap-1 text-slate-400 hover:text-blue-600 text-xs font-black z-10">
                      👍 <span className="tabular-nums">{article.like_count}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDislike(article.id); }} className="flex items-center gap-1 text-slate-400 hover:text-orange-600 text-xs font-black z-10">
                      👎 <span className="tabular-nums">{article.dislike_count}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveArticle(article); }} className="text-slate-400 hover:text-green-600 text-xs font-black z-10">
                      💬
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-black mb-6 text-slate-900 uppercase tracking-widest flex items-center gap-2">🔥 Trending</h2>
            <div className="space-y-6">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 group">
                  <span className="text-blue-100 font-black text-3xl leading-none">0{index + 1}</span>
                  <div>
                    <p onClick={() => router.push(`/dashboard/article/${item.id}`)} className="text-sm font-black text-slate-800 line-clamp-2 hover:text-blue-600 cursor-pointer">{item.title}</p>
                    <span className="text-[10px] text-slate-400 uppercase font-black">{item.like_count || 0} Likes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {activeArticle && (
        <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />
      )}
    </div>
  );
}