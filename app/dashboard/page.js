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

  // Load all necessary data from Supabase
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

      // Fetch trending articles (View or Table)
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

    // REALTIME HUB: Listening for any changes to articles or reactions
    const channel = supabase.channel('realtime-hub')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reactions' 
      }, () => loadData())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'articles' 
      }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} AT ${timePart}`;
  };

  const handleDeleteArticle = async (articleId) => {
    if (!confirm("Are you sure you want to permanently delete this discovery?")) return;
    
    // Because you set up CASCADE in the database, 
    // deleting the article here will automatically delete linked reactions/comments.
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    
    if (error) {
      alert("Error deleting article: " + error.message);
    } else {
      // Realtime listener will usually catch this, but manual refresh ensures UI is snappy
      loadData(); 
    }
  };

  const handleReaction = async (articleId, type) => {
    if (!user) return;
    const article = articles.find(a => a.id === articleId);
    const current = article?.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
    
    if (current === type) {
      // Remove reaction if user clicks the same button again
      await supabase.from('reactions').delete().match({ user_id: user.id, article_id: articleId });
    } else {
      // Add or Update reaction
      await supabase.from('reactions').upsert({ 
        user_id: user.id, 
        article_id: articleId, 
        reaction_type: type 
      }, { onConflict: 'user_id, article_id' });
    }
    loadData();
  };

  const handleShare = async (article) => {
    const url = `${window.location.origin}/dashboard/article/${article.id}`;
    if (navigator.share) {
      await navigator.share({ title: article.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Article link copied to clipboard!");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600">
      Syncing Hub...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-black text-blue-900 cursor-pointer" onClick={() => router.push('/dashboard')}>
          Article Hub
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
            @{user?.email?.split('@')[0]}
          </span>
          <button 
            onClick={() => router.push('/dashboard/new')} 
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-black hover:bg-blue-700 transition-colors"
          >
            + New Post
          </button>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} 
            className="text-slate-400 hover:text-red-500 text-sm font-black transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-800">Latest Discoveries</h2>
          
          {articles.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-300 text-center text-slate-400 font-bold">
              No articles found. Be the first to publish!
            </div>
          ) : (
            articles.map((article) => {
              const userReaction = article.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
              const isOwner = user?.id === article.user_id;
              
              return (
                <article key={article.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 relative group transition-all hover:shadow-md">
                  {isOwner && (
                    <button 
                      onClick={() => handleDeleteArticle(article.id)} 
                      className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors p-2"
                      title="Delete Article"
                    >
                      🗑️
                    </button>
                  )}
                  
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                      PUBLISHED {formatTimestamp(article.created_at)}
                    </span>
                  </div>

                  <div className="cursor-pointer" onClick={() => router.push(`/dashboard/article/${article.id}`)}>
                    <h3 className="text-2xl font-black group-hover:text-blue-700 mb-4 transition-colors leading-tight">
                      {article.title}
                    </h3>
                    {article.image_url && (
                      <img 
                        src={article.image_url} 
                        className="w-full h-80 object-cover rounded-3xl mb-4 border border-slate-50 shadow-inner" 
                        alt="Article Visual"
                      />
                    )}
                    <p className="text-slate-600 mb-6 leading-relaxed line-clamp-3">
                      {article.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleReaction(article.id, 'like')} 
                        className={`flex items-center gap-1 text-xs font-black transition-all active:scale-90 ${
                          userReaction === 'like' ? 'text-orange-500 scale-110' : 'text-slate-400 hover:text-orange-400'
                        }`}
                      >
                        🔥 {article.like_count}
                      </button>
                      
                      <button 
                        onClick={() => handleReaction(article.id, 'dislike')} 
                        className={`flex items-center gap-1 text-xs font-black transition-all active:scale-90 ${
                          userReaction === 'dislike' ? 'text-slate-900 scale-110' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        👎 {article.dislike_count}
                      </button>

                      <button 
                        onClick={() => setActiveArticle(article)} 
                        className="text-slate-400 text-xs font-black hover:text-blue-600 transition-colors"
                      >
                        💬 Comment
                      </button>
                      
                      <button 
                        onClick={() => handleShare(article)} 
                        className="text-slate-400 text-xs font-black hover:text-blue-600 transition-colors"
                      >
                        🔗 Share
                      </button>
                    </div>
                    <span className="text-xs font-black text-blue-600 italic bg-blue-50 px-2 py-0.5 rounded">
                      @{article.profiles?.username || 'anonymous'}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Sidebar */}
        <aside>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 sticky top-24 shadow-sm">
            <h2 className="text-lg font-black mb-6 uppercase tracking-widest flex items-center gap-2 text-slate-900">
              🔥 Trending
            </h2>
            <div className="space-y-6">
              {topArticles.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-4 cursor-pointer group" 
                  onClick={() => router.push(`/dashboard/article/${item.id}`)}
                >
                  <span className="text-blue-100 font-black text-3xl transition-colors group-hover:text-blue-300">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                      {item.like_count} Helpful
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
      
      {/* Modal is rendered only when an article is selected */}
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