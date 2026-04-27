'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
// Fixed import path based on your folder structure
import CommentModal from '../components/CommentModal'; 

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); // New state for the modal
  const router = useRouter();

  const loadData = async () => {
    // 1. Articles
    const { data: articleData } = await supabase
      .from('articles')
      .select(`*, profiles (username)`)
      .order('created_at', { ascending: false });
    setArticles(articleData || []);

    // 2. Trending
    const { data: topData } = await supabase.from('top_articles').select('*');
    setTopArticles(topData || []);

    // 3. Notifications (Load the last 10)
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
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <h1 className="text-xl font-bold text-blue-900">Article Hub</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden md:inline font-medium">
            {user?.email?.split('@')[0]}
          </span>

          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 text-slate-500 hover:text-blue-600 transition">
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-xl z-[60] overflow-hidden animate-in fade-in zoom-in duration-150">
                <div className="p-3 border-b font-bold text-slate-800 bg-slate-50">Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 text-sm italic">No new notifications.</p>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => { router.push(`/articles/${n.article_id}`); setShowNotifs(false); }} 
                        className="p-4 border-b border-slate-50 cursor-pointer hover:bg-blue-50 transition text-sm text-slate-700"
                      >
                        {n.message}
                        <span className="block text-[10px] text-slate-400 mt-1">Just now</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => router.push('/dashboard/new')} className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 text-sm font-semibold shadow-md active:scale-95 transition-all">
            + New Post
          </button>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 text-sm font-medium transition">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-800">Latest Discoveries</h2>
          {articles.map((article) => {
            const displayName = (article.profiles?.username || 'anonymous').split('@')[0];
            return (
              <article key={article.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{article.title}</h3>
                <p className="text-slate-600 mt-3 line-clamp-3">{article.content}</p>
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm uppercase">
                      {displayName.charAt(0)}
                    </div>
                    <span className="text-slate-700 text-sm font-bold">@{displayName}</span>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => handleLike(article.id)} className="text-slate-400 hover:text-blue-600 text-xs font-bold transition flex items-center gap-1">👍 Like</button>
                    {/* Fixed Comment Button to open modal */}
                    <button 
                      onClick={() => setActiveArticle(article)} 
                      className="text-slate-400 hover:text-green-600 text-xs font-bold transition"
                    >
                      💬 Comment
                    </button>
                    <button onClick={() => {
                        const url = `${window.location.origin}/articles/${article.id}`;
                        navigator.clipboard.writeText(url);
                        alert("Link copied!");
                    }} className="text-slate-400 hover:text-purple-600 text-xs font-bold transition">🔗 Share</button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">🔥 Trending Now</h2>
            <div className="space-y-6">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4">
                  <span className="text-blue-200 font-black text-2xl leading-none">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-700 line-clamp-2">{item.title}</p>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{item.like_count || 0} Likes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Logic to show the Modal popup */}
      {activeArticle && (
        <CommentModal 
          article={activeArticle} 
          user={user} 
          onClose={() => setActiveArticle(null)} 
        />
      )}
    </div>
  );
}