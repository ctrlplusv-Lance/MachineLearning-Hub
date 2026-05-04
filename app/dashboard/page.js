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

  const handleShare = async (article) => {
    const shareUrl = `${window.location.origin}/dashboard/article/${article.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `Check out this discovery by @${article.profiles?.username || 'anonymous'}:`,
          url: shareUrl,
        });
      } catch (err) { console.log("Share failed", err); }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard! ✨");
    }
  };

  const handleDeleteArticle = async (articleId) => {
    if (!confirm("Delete this discovery?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (error) alert("Error: " + error.message);
    else loadData(user.id);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-900 font-black uppercase text-[9px] tracking-[0.3em]">Syncing Hub</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      {/* PREMIUM NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 p-4 sticky top-0 z-50 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-900 cursor-pointer tracking-tighter" onClick={() => router.push('/dashboard')}>
            Art<span className="text-blue-600">Hub</span>
          </h1>
          
          <div className="flex items-center gap-4">
            <NotificationBell user={user} />
            
            <Link href="/dashboard/profile" className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-white shadow-md hover:scale-110 transition-transform">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center text-xs">👤</div>
              )}
            </Link>

            <button 
              onClick={() => router.push('/dashboard/new')} 
              className="hidden md:block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              + Post Discovery
            </button>
            
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors ml-2">Logout</button>
          </div>
        </div>
      </nav>

      {/* MOBILE FAB */}
      <button 
        onClick={() => router.push('/dashboard/new')}
        className="md:hidden fixed bottom-8 right-8 z-50 bg-gradient-to-br from-blue-600 to-indigo-700 text-white w-16 h-16 rounded-[2rem] shadow-2xl shadow-blue-400 flex items-center justify-center text-3xl transition-transform active:scale-90"
      >
        +
      </button>

      <main className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* FEED */}
        <section className="lg:col-span-2 space-y-8 md:space-y-12">
          
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Signals</h2>
            <div className="relative group w-full">
              <input 
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-100 py-4 px-14 rounded-3xl text-sm font-bold focus:ring-8 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all shadow-sm"
              />
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg grayscale group-focus-within:grayscale-0 transition-all">🔍</span>
            </div>
          </div>
          
          {filteredArticles.map((article) => {
            const userReaction = article.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
            return (
              <article key={article.id} className="group bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(15,23,42,0.06)] hover:-translate-y-1">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm">
                      {article.profiles?.avatar_url ? (
                        <img src={article.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600 font-black bg-blue-50 text-xs">
                          {article.profiles?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">@{article.profiles?.username || 'anonymous'}</p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        {new Date(article.created_at).toLocaleDateString()} • {new Date(article.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  {user?.id === article.author_id && (
                    <button onClick={() => handleDeleteArticle(article.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2 text-sm">🗑️</button>
                  )}
                </div>

                {/* Content */}
                <div className="cursor-pointer mb-8" onClick={() => router.push(`/dashboard/article/${article.id}`)}>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 leading-tight tracking-tight group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h3>
                  {article.image_url && (
                    <div className="relative overflow-hidden rounded-[2.5rem] mb-6 shadow-inner bg-slate-50 border border-slate-50">
                      <img src={article.image_url} className="w-full h-auto md:max-h-[500px] object-cover transition-transform duration-1000 group-hover:scale-[1.03]" alt="Visual" />
                    </div>
                  )}
                  <p className="text-slate-600 leading-relaxed line-clamp-3 font-medium text-base md:text-lg opacity-80 group-hover:opacity-100 transition-opacity">
                    {article.content}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleReaction(article.id, 'like')} 
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 ${userReaction === 'like' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600'}`}
                    >
                      🔥 {article.like_count}
                    </button>
                    <button 
                      onClick={() => setActiveArticle(article)} 
                      className="bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      💬 Discuss
                    </button>
                  </div>
                  <button 
                    onClick={() => handleShare(article)} 
                    className="w-11 h-11 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                    🔗
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="bg-white/70 backdrop-blur-md p-8 rounded-[3rem] border border-white/50 sticky top-28 shadow-xl shadow-slate-200/50">
            <h2 className="text-[10px] font-black mb-10 uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              Trending Discoveries
            </h2>
            <div className="space-y-10">
              {topArticles.map((item, index) => (
                <div key={item.id} className="flex items-start gap-5 cursor-pointer group" onClick={() => router.push(`/dashboard/article/${item.id}`)}>
                  <span className="text-slate-100 font-black text-4xl leading-none transition-colors group-hover:text-blue-100">{(index + 1).toString().padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight mb-2 uppercase tracking-tight">{item.title}</p>
                    <span className="text-[9px] bg-slate-50 text-slate-400 px-2 py-1 rounded-md font-black uppercase tracking-widest">{item.like_count} agrees</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-14 pt-8 border-t border-slate-100/50 text-center">
               <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.3em]">© 2026 ArtHub Platform</p>
            </div>
          </div>
        </aside>
      </main>
      
      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}