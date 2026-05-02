'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CommentModal from '../components/CommentModal'; 

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null); 
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

      // Fetch Trending
      const { data: topData } = await supabase.from('top_articles').select('*');
      setTopArticles(topData || []);
    } catch (err) {
      console.error("Dashboard Sync Error:", err.message);
    }
  };

  useEffect(() => {
    const setup = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/auth'); return; }
      setUser(authUser);
      await loadData();
      setLoading(false);
    };
    setup();

    const channel = supabase.channel('realtime-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = async (articleId, type) => {
    const article = articles.find(a => a.id === articleId);
    const current = article?.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
    if (current === type) {
      await supabase.from('reactions').delete().match({ user_id: user.id, article_id: articleId });
    } else {
      await supabase.from('reactions').upsert({ user_id: user.id, article_id: articleId, reaction_type: type }, { onConflict: 'user_id, article_id' });
    }
    loadData();
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Syncing...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-black text-blue-900 cursor-pointer" onClick={() => router.push('/dashboard')}>Article Hub</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-blue-600">@{user?.email?.split('@')[0]}</span>
          <button onClick={() => router.push('/dashboard/new')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold">+ New Post</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-slate-400 text-sm font-bold">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-800">Latest Discoveries</h2>
          {articles.map((article) => {
            const userReaction = article.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
            return (
              <article key={article.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Published {formatTimestamp(article.created_at)}</span>
                </div>
                <div className="cursor-pointer" onClick={() => router.push(`/dashboard/article/${article.id}`)}>
                  <h3 className="text-2xl font-black hover:text-blue-600 mb-4">{article.title}</h3>
                  {article.image_url && <img src={article.image_url} className="w-full h-72 object-cover rounded-2xl mb-4" />}
                  <p className="text-slate-600 mb-6">{article.content}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex gap-4">
                    <button onClick={() => handleReaction(article.id, 'like')} className={`flex items-center gap-1 text-xs font-black ${userReaction === 'like' ? 'text-orange-500' : 'text-slate-400'}`}>
                      🔥 {article.like_count}
                    </button>
                    <button onClick={() => handleReaction(article.id, 'dislike')} className={`flex items-center gap-1 text-xs font-black ${userReaction === 'dislike' ? 'text-slate-900' : 'text-slate-400'}`}>
                      👎 {article.dislike_count}
                    </button>
                    <button onClick={() => setActiveArticle(article)} className="text-slate-400 text-xs font-black">💬 Comment</button>
                    <button onClick={() => handleShare(article)} className="text-slate-400 text-xs font-black">🔗 Share</button>
                  </div>
                  <span className="text-xs font-black text-blue-600">@{article.profiles?.username}</span>
                </div>
              </article>
            );
          })}
        </div>

        {/* TRENDING SIDEBAR */}
        <aside>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 sticky top-24">
            <h2 className="text-lg font-black mb-6 uppercase tracking-widest">🔥 Trending</h2>
            {topArticles.map((item, index) => (
              <div key={item.id} className="flex items-start gap-4 mb-6 cursor-pointer" onClick={() => router.push(`/dashboard/article/${item.id}`)}>
                <span className="text-blue-100 font-black text-3xl">0{index + 1}</span>
                <div>
                  <p className="text-sm font-black text-slate-800 hover:text-blue-600">{item.title}</p>
                  <span className="text-[10px] text-slate-400 font-black uppercase">{item.like_count} Likes</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>
      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}