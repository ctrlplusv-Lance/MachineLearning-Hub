'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import CommentModal from '../components/CommentModal'; 
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Added to track logged-in user profile
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const router = useRouter();

  const loadData = async (userId) => {
    try {
      // 1. Fetch Articles with Author Profile (including avatars)
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*, profiles (username, avatar_url), reactions (reaction_type, user_id)')
        .order('created_at', { ascending: false });

      if (articleError) throw articleError;

      const formattedArticles = articleData.map(article => ({
        ...article,
        like_count: article.reactions?.filter(r => r.reaction_type === 'like').length || 0,
        dislike_count: article.reactions?.filter(r => r.reaction_type === 'dislike').length || 0
      }));
      setArticles(formattedArticles);

      // 2. Fetch Trending
      const { data: topData } = await supabase.from('top_articles').select('*');
      setTopArticles(topData || []);

      // 3. Fetch Logged-in User's Profile Info for Navbar
      if (userId) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();
        setUserProfile(pData);
      }

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
      await loadData(authUser.id);
      setLoading(false);
    };
    setup();

    const channel = supabase.channel('realtime-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData()) // Listen for avatar changes
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

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
    loadData(user.id);
  };

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleDeleteArticle = async (articleId) => {
    if (!confirm("Delete this discovery?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (error) alert("Error deleting: " + error.message);
    else loadData(user.id);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.3em]">Syncing Hub</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 cursor-pointer tracking-tighter" onClick={() => router.push('/dashboard')}>Article<span className="text-blue-600">Hub</span></h1>
        
        <div className="flex items-center gap-4">
          <NotificationBell user={user} />
          
          <Link 
            href="/dashboard/profile"
            className="flex items-center gap-2 group transition-all"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-50 bg-slate-100 shadow-sm group-hover:border-blue-400 transition-all">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
              )}
            </div>
            <span className="hidden md:block text-xs font-black text-slate-700 group-hover:text-blue-600 transition-colors">
              @{userProfile?.username || user?.email?.split('@')[0]}
            </span>
          </Link>

          <button onClick={() => router.push('/dashboard/new')} className="bg-blue-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">+ Post</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-slate-400 hover:text-red-500 text-xs font-black transition-colors px-2">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <section className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recent Activity</h2>
            
            <div className="relative group flex-1 max-w-sm">
              <input 
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 py-3 px-10 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>
          </div>
          
          {filteredArticles.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-4 text-xs tracking-widest mb-4">No discoveries found</p>
              <button onClick={() => setSearchQuery('')} className="text-blue-600 text-xs font-black uppercase underline">Reset</button>
            </div>
          ) : (
            filteredArticles.map((article) => {
              const userReaction = article.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
              return (
                <article key={article.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-xl hover:shadow-blue-900/5">
                  {/* Author Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                        {article.profiles?.avatar_url ? (
                          <img src={article.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs grayscale opacity-40">👤</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">@{article.profiles?.username || 'anonymous'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{formatTimestamp(article.created_at)}</p>
                      </div>
                    </div>
                    {user?.id === article.author_id && (
                      <button onClick={() => handleDeleteArticle(article.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">🗑️</button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="cursor-pointer" onClick={() => router.push(`/dashboard/article/${article.id}`)}>
                    <h3 className="text-xl font-black group-hover:text-blue-600 mb-4 transition-colors leading-snug tracking-tight">{article.title}</h3>
                    {article.image_url && (
                      <div className="overflow-hidden rounded-[2rem] mb-5 border border-slate-50">
                        <img src={article.image_url} className="w-full h-96 object-cover group-hover:scale-[1.01] transition-transform duration-700" alt="Post" />
                      </div>
                    )}
                    <p className="text-slate-600 mb-6 leading-relaxed line-clamp-2 font-medium text-sm">{article.content}</p>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                    <div className="flex gap-5">
                      <button onClick={() => handleReaction(article.id, 'like')} className={`flex items-center gap-1.5 text-xs font-black transition-all active:scale-75 ${userReaction === 'like' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}>
                        🔥 <span className="mt-0.5">{article.like_count}</span>
                      </button>
                      <button onClick={() => handleReaction(article.id, 'dislike')} className={`flex items-center gap-1.5 text-xs font-black transition-all active:scale-75 ${userReaction === 'dislike' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                        👎 <span className="mt-0.5">{article.dislike_count}</span>
                      </button>
                      <button onClick={() => setActiveArticle(article)} className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors">💬 Comment</button>
                    </div>
                    <button onClick={() => handleShare(article)} className="p-2 bg-slate-50 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">🔗</button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 sticky top-28 shadow-sm">
            <h2 className="text-xs font-black mb-8 uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">Trending Now</h2>
            <div className="space-y-8">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 cursor-pointer group" onClick={() => router.push(`/dashboard/article/${item.id}`)}>
                  <span className="text-slate-100 font-black text-3xl group-hover:text-blue-100 transition-colors">{(index + 1).toString().padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight mb-1">{item.title}</p>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.like_count} Discoverers agree</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-50 text-center">
               <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2026 ArticleHub v2.0</p>
            </div>
          </div>
        </aside>
      </main>
      
      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}