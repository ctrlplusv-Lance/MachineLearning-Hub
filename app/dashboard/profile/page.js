'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [myArticles, setMyArticles] = useState([]);
  
  // --- AVATAR STATE ---
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

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

    // 1. Get Profile Info (Including avatar_url)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (profileData) {
      setUsername(profileData.username || '');
      setAvatarPreview(profileData.avatar_url || null);
    }

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      let finalAvatarUrl = avatarPreview;

      // 1. If a new file was selected, upload it
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        finalAvatarUrl = urlData.publicUrl;
      }

      // 2. Update the Profile table
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          username: username, 
          avatar_url: finalAvatarUrl,
          updated_at: new Date() 
        });

      if (error) throw error;
      alert('Profile updated successfully!');
      setAvatarFile(null); // Reset file state after success
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (articleId) => {
    const confirmDelete = confirm("Are you sure you want to delete this discovery? This cannot be undone.");
    if (!confirmDelete) return;

    const { error } = await supabase.from('articles').delete().eq('id', articleId);

    if (error) {
      alert("Error deleting: " + error.message);
    } else {
      const updatedArticles = myArticles.filter(a => a.id !== articleId);
      setMyArticles(updatedArticles);
      if (Math.ceil(updatedArticles.length / articlesPerPage) < currentPage && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  // Pagination Logic
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = myArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(myArticles.length / articlesPerPage);

  if (loading && !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
       <p className="text-blue-600 font-black animate-pulse uppercase tracking-widest text-xs">Syncing Profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* TOP SECTION: Settings Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-2">
            ⚙️ Profile Settings
          </h1>

          <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
            
            {/* AVATAR UPLOADER */}
            <div className="relative group">
              <label className="cursor-pointer block relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <span className="text-4xl">👤</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter">Change Photo</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={loading} />
              </label>
            </div>

            {/* FIELDS */}
            <div className="flex-1 grid gap-6 w-full">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Email Address</label>
                  <input type="text" disabled value={user?.email || ''} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-sm font-bold cursor-not-allowed" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Username</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none transition font-bold text-slate-700 bg-white"
                    placeholder="Enter username..."
                  />
                </div>
              </div>

              <button 
                onClick={updateProfile}
                disabled={loading}
                className="w-full md:w-max px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Content Management */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-xl font-black text-slate-900">Your Discoveries</h2>
            <span className="bg-white border border-slate-200 text-slate-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
              {myArticles.length} Posts • Page {currentPage} of {totalPages || 1}
            </span>
          </div>

          <div className="grid gap-4">
            {currentArticles.map((article) => (
              <div key={article.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-200 flex items-center justify-between group hover:border-blue-200 transition-all hover:shadow-md hover:shadow-blue-500/5">
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => router.push(`/dashboard/article/${article.id}`)}
                >
                  {article.image_url ? (
                    <img src={article.image_url} className="w-14 h-14 rounded-2xl object-cover border border-slate-100" alt="" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl grayscale opacity-50">📄</div>
                  )}
                  <div>
                    <h3 className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">{article.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      {new Date(article.created_at).toLocaleDateString()} • {article.like_count || 0} Likes
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => deleteArticle(article.id)}
                  className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-xs uppercase flex items-center gap-2"
                >
                  <span className="hidden md:inline">Delete</span> 🗑️
                </button>
              </div>
            ))}

            {/* PAGINATION CONTROLS */}
            {myArticles.length > articlesPerPage && (
              <div className="flex justify-center items-center gap-6 pt-6">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                >
                  ← Prev
                </button>
                
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-500 ${currentPage === i + 1 ? 'bg-blue-600 w-8' : 'bg-slate-200 w-2'}`}
                    />
                  ))}
                </div>

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Next →
                </button>
              </div>
            )}

            {myArticles.length === 0 && (
              <div className="text-center py-20 bg-slate-100/30 rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No discoveries published yet.</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard')}
          className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-blue-600 transition-all"
        >
          ← Back to Hub
        </button>
      </div>
    </div>
  );
}