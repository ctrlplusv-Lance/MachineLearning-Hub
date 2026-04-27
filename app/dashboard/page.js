'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState(null);
  const router = useRouter();

  // Function to load all data - called on mount and when database changes
  const loadData = async () => {
    // 1. Fetch Main Articles Feed with profile info
    const { data: articleData } = await supabase
      .from('articles')
      .select(`
        *,
        profiles (username)
      `)
      .order('created_at', { ascending: false });
    setArticles(articleData || []);

    // 2. Fetch Top 5 Articles (Trending) from your View
    const { data: topData } = await supabase
      .from('top_articles')
      .select('*');
    setTopArticles(topData || []);
  };

  useEffect(() => {
    const setup = async () => {
      // Check Auth Session
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

    // --- REALTIME SUBSCRIPTION ---
    // Listens for changes in likes/articles and refreshes the feed automatically
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'likes' }, 
        () => loadData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'articles' }, 
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleLike = async (articleId) => {
    if (!user) return;

    // Toggle Like logic
    const { error } = await supabase
      .from('likes')
      .insert([{ 
        user_id: user.id, 
        article_id: articleId 
      }]);

    if (error) {
      if (error.code === '23505') { // Unique violation = already liked
        await supabase
          .from('likes')
          .delete()
          .match({ user_id: user.id, article_id: articleId });
      } else {
        console.error("Error toggling like:", error.message);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleShare = async (title, id) => {
    // IMPORTANT: Pointing to /articles/ for the public view
    const shareUrl = `${window.location.origin}/articles/${id}`;
    
    if (navigator.share) {
      try { await navigator.share({ title, url: shareUrl }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Public link copied!");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-blue-900 font-bold animate-pulse text-xl">Loading Hub...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* NAVIGATION */}
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <h1 className="text-xl font-bold text-blue-900">ML Hub</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">{user?.email}</span>
          <button 
            onClick={() => router.push('/dashboard/new')} 
            className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            + New Post
          </button>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 text-sm font-medium transition">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FEED */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-800">Latest Discoveries</h2>
          {articles.map((article) => {
            const rawName = article.profiles?.username || 'anonymous';
            const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName;

            return (
              <article key={article.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{article.title}</h3>
                <p className="text-slate-600 mt-3 line-clamp-3">{article.content}</p>
                
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-700 text-sm font-bold">@{displayName}</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleLike(article.id)}
                      className="text-slate-400 hover:text-blue-600 text-xs font-bold transition flex items-center gap-1"
                    >
                      👍 Like
                    </button>
                    {/* <button className="text-slate-400 hover:text-green-600 text-xs font-bold transition">💬 Comment</button> */}
                    <button 
                      onClick={() => setOpenComments(openComments === article.id ? null : article.id)}
                      className="text-slate-400 hover:text-green-600 text-xs font-bold transition">
                      {openComments === article.id ? 'Hide' : '💬 Comment'}
                    </button>
                    <button onClick={() => handleShare(article.title, article.id)} className="text-slate-400 hover:text-purple-600 text-xs font-bold transition">🔗 Share</button>
                  </div>
                  {openComments === article.id && (
                    <div className="w-full mt-4">

                      {/* COMMENT INPUT */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const content = e.target.comment.value;
                          if (!content) return;

                          await supabase.from('comments').insert([
                            {
                              article_id: article.id,
                              user_id: user.id,
                              content,
                              parent_id: null,
                            },
                          ]);

                          e.target.reset();
                          loadData();
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="comment"
                          placeholder="Write a comment..."
                          className="flex-1 border rounded-full px-3 py-1 text-xs"
                        />
                        <button className="text-xs bg-green-500 text-white px-3 rounded-full">
                          Post
                        </button>
                      </form>

                      {/* THREADING LOGIC */}
                      {(() => {
                        const mainComments = (article.comments || []).filter(
                          (c) => !c.parent_id
                        );

                        return (
                          <div className="mt-3 space-y-3">
                            {mainComments.map((comment) => {
                              const displayName =
                                comment.profiles?.username?.split('@')[0] || 'anonymous';

                              const replies = (article.comments || []).filter(
                                (c) => c.parent_id === comment.id
                              );

                              return (
                                <div key={comment.id} className="bg-slate-100 p-3 rounded-lg">

                                  {/* MAIN COMMENT */}
                                  <p className="font-bold text-slate-700 text-xs">
                                    @{displayName}
                                  </p>
                                  <p className="text-slate-600 text-xs">{comment.content}</p>

                                  {/* REPLY BUTTON */}
                                  <button
                                    onClick={async () => {
                                      const reply = prompt("Write a reply:");
                                      if (!reply) return;

                                      await supabase.from('comments').insert([
                                        {
                                          article_id: article.id,
                                          user_id: user.id,
                                          content: reply,
                                          parent_id: comment.id,
                                        },
                                      ]);

                                      loadData();
                                    }}
                                    className="text-[10px] text-blue-500 mt-1"
                                  >
                                    Reply
                                  </button>

                                  {/* NESTED REPLIES */}
                                  <div className="ml-6 mt-2 space-y-2">
                                    {replies.map((reply) => {
                                      const replyName =
                                        reply.profiles?.username?.split('@')[0] || 'anonymous';

                                      return (
                                        <div
                                          key={reply.id}
                                          className="bg-white p-2 rounded shadow-sm"
                                        >
                                          <p className="font-bold text-xs">@{replyName}</p>
                                          <p className="text-xs">{reply.content}</p>
                                        </div>
                                      );
                                    })}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* TRENDING SIDEBAR */}
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
    </div>
  );
}