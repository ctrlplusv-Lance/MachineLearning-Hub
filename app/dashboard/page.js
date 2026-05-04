'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import CommentModal from '../components/CommentModal'; 
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const router = useRouter();

  const loadData = async (userId) => {
    try {
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

      const { data: topData } = await supabase.from('top_articles').select('*');
      setTopArticles(topData || []);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData()) 
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 text-center">
      <div>
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-600 font-black uppercase text-[10px] tracking-[0.3em]">Syncing Hub</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-0">
      {/* NAVBAR: Fixed height & responsive padding */}
      <nav className="bg-white/80 backdrop-blur-md border-b p-3 md:p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-lg md:text-xl font-black text-slate-900 cursor-pointer tracking-tighter" onClick={() => router.push('/dashboard')}>
          Art<span className="text-blue-600">Hub</span>
        </h1>
        
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell user={user} />
          
          <Link href="/dashboard/profile" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-50 bg-slate-100 shadow-sm group-hover:border-blue-400 transition-all">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs opacity-40">👤</div>
              )}
            </div>
          </Link>

          {/* Desktop Only Button */}
          <button 
            onClick={() => router.push('/dashboard/new')} 
            className="hidden sm:block bg-blue-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100"
          >
            + Post
          </button>
          
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-slate-400 hover:text-red-500 text-xs font-black px-2">Logout</button>
        </div>
      </nav>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button 
        onClick={() => router.push('/dashboard/new')}
        className="sm:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform"
      >
        +
      </button>

      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        
        {/* FEED SECTION */}
        <section className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* Header & Search */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Recent Activity</h2>
            
            <div className="relative group w-full">
              <input 
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 py-3.5 px-12 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-sm">🔍</span>
            </div>
          </div>
          
          {filteredArticles.length === 0 ? (
            <div className="bg-white p-12 md:p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No discoveries found</p>
            </div>
          ) : (
            filteredArticles.map((article) => {
              const userReaction = article.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
              return (
                <article key={article.id} className="bg-white p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-xl hover:shadow-blue-900/5">
                  
                  {/* Author Header */}
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border border-slate-100 bg-slate-50">
                        {article.profiles?.avatar_url ? (
                          <img src={article.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs opacity-30">👤</div>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] md:text-xs font-black text-slate-900 uppercase">@{article.profiles?.username || 'anonymous'}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-300 uppercase">{formatTimestamp(article.created_at)}</p>
                      </div>
                    </div>
                    {user?.id === article.author_id && (
                      <button onClick={() => handleDeleteArticle(article.id)} className="text-slate-300 hover:text-red-500 p-2">🗑️</button>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="cursor-pointer" onClick={() => router.push(`/dashboard/article/${article.id}`)}>
                    <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3 md:mb-4 leading-tight">{article.title}</h3>
                    {article.image_url && (
                      <div className="overflow-hidden rounded-2xl md:rounded-[2rem] mb-4 md:mb-5 aspect-video md:aspect-auto">
                        <img src={article.image_url} className="w-full h-full md:h-96 object-cover transition-transform duration-700" alt="Post" />
                      </div>
                    )}
                    <p className="text-slate-600 mb-6 leading-relaxed line-clamp-3 text-sm md:text-base font-medium">{article.content}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 md:pt-5 border-t border-slate-50">
                    <div className="flex gap-4 md:gap-5">
                      <button onClick={() => handleReaction(article.id, 'like')} className={`flex items-center gap-1.5 text-xs font-black transition-all ${userReaction === 'like' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}>
                        🔥 <span>{article.like_count}</span>
                      </button>
                      <button onClick={() => setActiveArticle(article)} className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600">💬 Comment</button>
                    </div>
                    <button onClick={async () => {
                      const url = `${window.location.origin}/dashboard/article/${article.id}`;
                      await navigator.clipboard.writeText(url);
                      alert("Link Copied!");
                    }} className="p-2 bg-slate-50 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600">🔗</button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* SIDEBAR: Hidden on Mobile & Tablets, shown on Large Screens */}
        <aside className="hidden lg:block">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 sticky top-28 shadow-sm">
            <h2 className="text-[10px] font-black mb-8 uppercase tracking-[0.2em] text-slate-400">Trending Now</h2>
            <div className="space-y-8">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 cursor-pointer group" onClick={() => router.push(`/dashboard/article/${item.id}`)}>
                  <span className="text-slate-100 font-black text-3xl group-hover:text-blue-100 transition-colors">{(index + 1).toString().padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight mb-1">{item.title}</p>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.like_count} agrees</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-50 text-center">
               <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2026 ArtHub v2.0</p>
            </div>
          </div>
        </aside>
      </main>
      
      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}