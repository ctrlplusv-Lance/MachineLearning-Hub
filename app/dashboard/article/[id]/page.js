'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import CommentModal from '@/app/components/CommentModal';
import NotificationBell from '@/app/components/NotificationBell';

export default function ArticleDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const fetchArticle = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*, profiles (username, avatar_url), reactions (reaction_type, user_id)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedArticle = {
        ...data,
        like_count: data.reactions?.filter(r => r.reaction_type === 'like').length || 0,
      };

      setArticle(formattedArticle);

      if (userId) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();
        setUserProfile(pData);
      }
    } catch (err) {
      console.error("Error fetching article:", err.message);
      router.push('/dashboard'); 
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const setup = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth');
        return;
      }
      setUser(authUser);
      await fetchArticle(authUser.id);
    };
    setup();

    const channel = supabase.channel(`article-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `article_id=eq.${id}` }, () => fetchArticle(user?.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchArticle, user?.id, router]);

  const handleReaction = async () => {
    if (!user || !article) return;
    const hasLiked = article.reactions?.find(r => r.user_id === user?.id && r.reaction_type === 'like');
    
    if (hasLiked) {
      await supabase.from('reactions').delete().match({ user_id: user.id, article_id: id, reaction_type: 'like' });
    } else {
      await supabase.from('reactions').upsert({ 
        user_id: user.id, 
        article_id: id, 
        reaction_type: 'like' 
      }, { onConflict: 'user_id, article_id' });
    }
    fetchArticle(user.id);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!article) return null;

  const hasLiked = article.reactions?.find(r => r.user_id === user?.id && r.reaction_type === 'like');

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-24">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-black text-slate-900 tracking-tighter">
            Art<span className="text-blue-600">Hub</span>
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell user={user} />
            <Link href="/dashboard/profile" className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-white shadow-md">
              <img src={userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.username || 'U'}`} className="w-full h-full object-cover" alt="Profile" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-10 transition-colors">
          ← Back to Discoveries
        </Link>

        <article className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
              <img src={article.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${article.profiles?.username}`} className="w-full h-full object-cover" alt="" />
            </div>
            <div>
              <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">@{article.profiles?.username}</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Published Discovery</p>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
            {article.title}
          </h1>

          {article.image_url && (
            <div className="rounded-[2.5rem] overflow-hidden mb-10 border border-slate-50 shadow-inner">
              <img src={article.image_url} className="w-full h-auto object-cover" alt={article.title} />
            </div>
          )}

          <div className="text-slate-600 text-lg leading-relaxed font-medium mb-12 whitespace-pre-wrap">
            {article.content}
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-50">
            <button 
              onClick={handleReaction} 
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${hasLiked ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-blue-50'}`}
            >
              🔥 {article.like_count} Agree
            </button>
            <button 
              onClick={() => setActiveArticle(article)} 
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-blue-600 shadow-xl shadow-slate-200"
            >
              💬 Open Discussion
            </button>
          </div>
        </article>
      </main>

      {activeArticle && <CommentModal article={activeArticle} user={user} onClose={() => setActiveArticle(null)} />}
    </div>
  );
}