'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ArticleDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [user, setUser] = useState(null);
  const [userReaction, setUserReaction] = useState(null);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });

  const fetchData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const { data, error } = await supabase.from('articles')
      .select('*, profiles(username), comments(*, profiles(username))')
      .eq('id', id)
      .single();
      
    if (error || !data) {
      router.push('/dashboard');
      return;
    }
    setArticle(data);

    const { data: reacts } = await supabase.from('reactions')
      .select('*')
      .eq('article_id', id);

    setCounts({
      likes: reacts?.filter(r => r.reaction_type === 'like').length || 0,
      dislikes: reacts?.filter(r => r.reaction_type === 'dislike').length || 0
    });
    
    if (authUser) {
      setUserReaction(reacts?.find(r => r.user_id === authUser.id)?.reaction_type || null);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();

      // Realtime subscription for comments and reactions
      const channel = supabase.channel(`article-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `article_id=eq.${id}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `article_id=eq.${id}` }, () => fetchData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} AT ${timePart}`;
  };

  const handleDeleteArticle = async () => {
    if (!confirm("Are you sure you want to permanently delete this discovery?")) return;
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) alert("Error deleting article");
    else router.push('/dashboard');
  };

  const handleReaction = async (type) => {
    if (!user) return alert("Please sign in first!");
    if (userReaction === type) {
      await supabase.from('reactions').delete().match({ article_id: id, user_id: user.id });
    } else {
      await supabase.from('reactions').upsert({ 
        article_id: id, 
        user_id: user.id, 
        reaction_type: type 
      }, { onConflict: 'user_id, article_id' });
    }
    fetchData();
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Remove this comment?")) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) alert("Error deleting comment");
    else fetchData();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: article.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  if (!article) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">Syncing...</div>;

  const isArticleOwner = user?.id === article.user_id;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-[3rem] border border-slate-200 p-8 md:p-12 shadow-sm relative">
        
        {/* Article Delete Button (Only for Author) */}
        {isArticleOwner && (
          <button 
            onClick={handleDeleteArticle}
            className="absolute top-12 right-12 text-slate-300 hover:text-red-500 transition-colors text-xl"
            title="Delete Article"
          >
            🗑️
          </button>
        )}

        <Link href="/dashboard" className="text-blue-600 font-black text-xs mb-8 inline-block uppercase tracking-widest hover:underline">
          ← Back to Hub
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">
            {article.profiles?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-sm text-slate-900">@{article.profiles?.username}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              PUBLISHED {formatTimestamp(article.created_at)}
            </p>
          </div>
        </div>

        <h1 className="text-4xl font-black mb-8 leading-tight text-slate-900">{article.title}</h1>
        
        {article.image_url && (
          <img 
            src={article.image_url} 
            className="w-full rounded-[2rem] mb-8 shadow-sm border border-slate-50 object-cover max-h-[500px]" 
            alt="Article"
          />
        )}

        <p className="text-lg text-slate-700 leading-relaxed mb-12 whitespace-pre-wrap">
          {article.content}
        </p>

        <div className="flex flex-wrap gap-3 pb-12 border-b border-slate-50">
          <button 
            onClick={() => handleReaction('like')} 
            className={`px-8 py-3.5 rounded-full font-black text-xs transition-all active:scale-95 flex items-center gap-2 ${
              userReaction === 'like' 
              ? 'bg-orange-500 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{userReaction === 'like' ? '🔥' : '👍'}</span>
            {userReaction === 'like' ? 'Helpful!' : 'Helpful'} 
            {counts.likes > 0 && <span className="ml-1 opacity-80">{counts.likes}</span>}
          </button>

          <button 
            onClick={() => handleReaction('dislike')} 
            className={`px-8 py-3.5 rounded-full font-black text-xs transition-all active:scale-95 flex items-center gap-2 ${
              userReaction === 'dislike' 
              ? 'bg-slate-900 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>👎</span>
            Not for me 
            {counts.dislikes > 0 && <span className="ml-1 opacity-80">{counts.dislikes}</span>}
          </button>

          <button 
            onClick={handleShare} 
            className="bg-slate-100 px-8 py-3.5 rounded-full font-black text-xs text-slate-600 transition-all hover:bg-slate-200 border border-slate-200 flex items-center gap-2"
          >
            🔗 Share Discovery
          </button>
        </div>

        <section className="mt-12">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2 text-slate-900">
            💬 Discussion ({article.comments?.length || 0})
          </h3>
          <div className="space-y-4">
            {article.comments && article.comments.length > 0 ? (
              article.comments.map(c => {
                const isCommentOwner = user?.id === c.user_id;
                return (
                  <div key={c.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-black text-blue-700">
                        @{c.profiles?.username} • <span className="text-slate-400 font-bold uppercase">{formatTimestamp(c.created_at)}</span>
                      </p>
                      {isCommentOwner && (
                        <button 
                          onClick={() => handleDeleteComment(c.id)} 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-sm italic py-4">No comments yet. Start the conversation!</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}