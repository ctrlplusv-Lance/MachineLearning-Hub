'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [myArticles, setMyArticles] = useState([]);
  
  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 5; 

  const router = useRouter();

  const fetchData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/auth');
      return;
    }
    setUser(authUser);

    // 1. Get Profile Info
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authUser.id)
      .single();

    if (profileData) setUsername(profileData.username || '');

    // 2. Get User's Articles
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', authUser.id)
      .order('created_at', { ascending: false });

    setMyArticles(articles || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  // --- PAGINATION CALCULATION ---
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = myArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(myArticles.length / articlesPerPage);

  const updateProfile = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: username, updated_at: new Date() });

    if (error) alert(error.message);
    else alert('Profile updated!');
    setLoading(false);
  };

  const deleteArticle = async (articleId) => {
    const confirmDelete = confirm("Are you sure you want to delete this discovery? This cannot be undone.");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      alert("Error deleting: " + error.message);
    } else {
      // Refresh the list locally
      const updatedArticles = myArticles.filter(a => a.id !== articleId);
      setMyArticles(updatedArticles);
      
      // If we delete the last item on a page, move back one page
      if (currentArticles.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
       <p className="text-blue-600 font-black animate-pulse uppercase tracking-widest text-xs">Syncing Profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* TOP SECTION: Settings Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            ⚙️ Profile Settings
          </h1>
          
          <div className="grid md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Email Address</label>
              <input 
                type="text" 
                disabled 
                value={user?.email} 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Username</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition font-bold text-slate-700"
                  placeholder="Enter username..."
                />
                <button 
                  onClick={updateProfile}
                  className="bg-blue-600 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-100"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Content Management */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-xl font-black text-slate-900">Your Discoveries</h2>
            <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
              Page {currentPage} of {totalPages || 1}
            </span>
          </div>

          <div className="grid gap-4">
            {currentArticles.map((article) => (
              <div key={article.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:border-blue-200 transition-all">
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => router.push(`/dashboard/article/${article.id}`)}
                >
                  {article.image_url ? (
                    <img src={article.image_url} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">📄</div>
                  )}
                  <div>
                    <h3 className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">{article.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(article.created_at).toLocaleDateString()} • 🔥 {article.helpful_count || 0} Helpful
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => deleteArticle(article.id)}
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-black text-xs uppercase flex items-center gap-2"
                >
                  <span className="hidden md:inline">Delete</span> 🗑️
                </button>
              </div>
            ))}

            {/* --- PAGINATION CONTROLS --- */}
            {myArticles.length > articlesPerPage && (
              <div className="flex justify-center items-center gap-6 pt-6">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                >
                  ← Prev
                </button>
                
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === i + 1 ? 'bg-blue-600 w-6' : 'bg-slate-300'}`}
                    />
                  ))}
                </div>

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Next →
                </button>
              </div>
            )}

            {myArticles.length === 0 && (
              <div className="text-center py-20 bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No discoveries yet.</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard')}
          className="w-full py-4 text-slate-400 text-xs font-black uppercase tracking-[0.2em] hover:text-blue-600 transition"
        >
          ← Back to Hub
        </button>
      </div>
    </div>
  );
}