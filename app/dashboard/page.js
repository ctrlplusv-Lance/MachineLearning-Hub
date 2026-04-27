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
    // Fetch articles and join with profiles to get custom usernames
    const { data: articleData } = await supabase
      .from('articles')
      .select(`*, profiles (username)`)
      .order('created_at', { ascending: false });
    setArticles(articleData || []);

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
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-inner"></div>
          <h1 className="text-xl font-black text-blue-900 tracking-tight">Article Hub</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Fixed: Added clickable profile link */}
          <button 
            onClick={() => router.push('/dashboard/profile')}
            className="text-sm text-blue-600 hover:text-blue-800 hidden md:inline font-bold transition-colors border-b-2 border-transparent hover:border-blue-800"
          >
            @{user?.email?.split('@')[0]}
          </button>

          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 text-slate-500 hover:text-blue-600 transition">
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b font-bold text-slate-800 bg-slate-50 flex justify-between items-center">
                  <span>Notifications</span>
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-[10px] text-blue-600 hover:underline uppercase tracking-tighter"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm italic">No new updates</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          if (n.article_id) {
                            router.push(`/dashboard/article/${n.article_id}`);
                            setShowNotifs(false);
                          }
                        }}
                        className="p-4 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex gap-3">
                          <div className="w-2 h-2 mt-1.5 bg-blue-500 rounded-full shrink-0 group-hover:scale-125 transition-transform"></div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {n.message}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">Read article →</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => router.push('/dashboard/new')} className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 text-sm font-bold shadow-md active:scale-95 transition-all">
            + New Post
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 text-sm font-bold transition">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Latest Discoveries</h2>
          {articles.map((article) => {
            // Priority: profiles.username -> email prefix -> anonymous
            const displayName = article.profiles?.username || article.profiles?.email?.split('@')[0] || 'anonymous';
            return (
              <article key={article.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                <h3 
                  onClick={() => router.push(`/dashboard/article/${article.id}`)}
                  className="text-2xl font-black text-slate-900 group-hover:text-blue-700 cursor-pointer transition-colors leading-tight"
                >
                  {article.title}
                </h3>
                <p className="text-slate-600 mt-3 line-clamp-2 leading-relaxed">{article.content}</p>
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black uppercase shadow-inner">
                      {displayName.charAt(0)}
                    </div>
                    <span className="text-slate-900 text-sm font-black">@{displayName.split('@')[0]}</span>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => handleLike(article.id)} className="text-slate-400 hover:text-blue-600 text-xs font-black transition uppercase tracking-wider">👍 Like</button>
                    <button onClick={() => setActiveArticle(article)} className="text-slate-400 hover:text-green-600 text-xs font-black transition uppercase tracking-wider">💬 Comment</button>
                    <button onClick={() => {
                        const url = `${window.location.origin}/dashboard/article/${article.id}`;
                        navigator.clipboard.writeText(url);
                        alert("Link copied!");
                    }} className="text-slate-400 hover:text-purple-600 text-xs font-black transition uppercase tracking-wider">🔗 Share</button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-black mb-6 text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="text-xl">🔥</span> Trending
            </h2>
            <div className="space-y-6">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 group">
                  <span className="text-blue-100 font-black text-3xl leading-none group-hover:text-blue-200 transition-colors">0{index + 1}</span>
                  <div>
                    <p 
                      onClick={() => router.push(`/dashboard/article/${item.id}`)}
                      className="text-sm font-black text-slate-800 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors leading-snug"
                    >
                      {item.title}
                    </p>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{item.like_count || 0} Likes</span>
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