'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get current logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);

      // 2. Fetch Main Articles Feed (joined with profiles for username)
      const { data: articleData } = await supabase
        .from('articles')
        .select(`*, profiles(username)`)
        .order('created_at', { ascending: false });
      setArticles(articleData || []);

      // 3. Fetch Top 5 Articles from the View
      const { data: topData } = await supabase
        .from('top_articles')
        .select('*');
      setTopArticles(topData || []);

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // FIXED: Logic for sharing to platforms as a message
  const handleShare = async (title, id) => {
    // This creates a link to the article. 
    // Ensure you create the folder app/dashboard/article/[id]/page.js later!
    const shareUrl = `${window.location.origin}/dashboard/article/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Read this on Machine Learning Hub: ${title}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback for PC/Browsers without native share
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied! You can now paste this in a message.");
      } catch (err) {
        alert("Failed to copy link.");
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-blue-900 font-bold animate-bounce text-xl">Loading Hub...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* --- NAVIGATION BAR --- */}
      <nav className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <h1 className="text-xl font-bold text-blue-900 tracking-tight">ML Hub</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">{user?.email}</span>
          <button 
            onClick={() => router.push('/dashboard/new')} 
            className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            + New Post
          </button>
          <button 
            onClick={handleLogout} 
            className="text-gray-400 hover:text-red-500 text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- MAIN ARTICLES FEED --- */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-800">Latest Discoveries</h2>
          {articles.length === 0 ? (
            <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-medium">The feed is empty. Start the conversation!</p>
            </div>
          ) : (
            articles.map((article) => (
              <article key={article.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition">
                  {article.title}
                </h3>
                <p className="text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                  {article.content}
                </p>
                
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                    <span className="text-slate-500 text-xs font-semibold">
                      @{article.profiles?.username || 'user'}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 sm:gap-6">
                    <button className="text-slate-400 hover:text-blue-600 flex items-center gap-1.5 text-xs font-bold transition">
                      👍 Like
                    </button>
                    <button className="text-slate-400 hover:text-green-600 flex items-center gap-1.5 text-xs font-bold transition">
                      💬 Comment
                    </button>
                    <button 
                      onClick={() => handleShare(article.title, article.id)}
                      className="text-slate-400 hover:text-purple-600 flex items-center gap-1.5 text-xs font-bold transition"
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        {/* --- SIDEBAR: TRENDING --- */}
        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
              <span className="animate-pulse">🔥</span> Trending Now
            </h2>
            <div className="space-y-6">
              {topArticles.length > 0 ? (
                topArticles.map((item, index) => (
                  <div key={item.id} className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 overflow-hidden">
                      <span className="text-blue-200 font-black text-2xl leading-none">0{index + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-700 line-clamp-2 leading-snug hover:text-blue-600 cursor-pointer transition">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                          {item.like_count || 0} Likes
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center">No trending articles yet.</p>
              )}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}