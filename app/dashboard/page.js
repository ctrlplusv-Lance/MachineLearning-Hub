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
      // 1. Check Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth');
        return;
      }
      setUser(authUser);

      // 2. Fetch Articles with a "Named Join"
      // We use 'profiles' directly. If it fails, ensure RLS Select policy is ON for profiles.
      const { data: articleData, error } = await supabase
        .from('articles')
        .select(`
          *,
          profiles (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch error:", error.message);
      }
      
      setArticles(articleData || []);

      // 3. Fetch Trending
      const { data: topData } = await supabase.from('top_articles').select('*');
      setTopArticles(topData || []);
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleShare = async (title, id) => {
    const shareUrl = `${window.location.origin}/dashboard/article/${id}`;
    if (navigator.share) {
      try { 
        await navigator.share({ title, url: shareUrl }); 
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
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
          {articles.length === 0 ? (
             <div className="bg-white p-10 rounded-2xl border text-center text-gray-400">No articles found.</div>
          ) : (
            articles.map((article) => {
              // Safety check: handle if username is an email or null
              const rawName = article.profiles?.username || 'anonymous';
              const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName;

              return (
                <article key={article.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{article.title}</h3>
                  <p className="text-slate-600 mt-3 line-clamp-3 leading-relaxed">{article.content}</p>
                  
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-700 text-sm font-bold">
                        @{displayName}
                      </span>
                    </div>
                    
                    <div className="flex gap-4">
                      <button className="text-slate-400 hover:text-blue-600 text-xs font-bold transition">👍 Like</button>
                      <button className="text-slate-400 hover:text-green-600 text-xs font-bold transition">💬 Comment</button>
                      <button onClick={() => handleShare(article.title, article.id)} className="text-slate-400 hover:text-purple-600 text-xs font-bold transition">🔗 Share</button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* TRENDING */}
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