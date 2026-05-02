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

    const { data, error } = await supabase.from('articles').select('*, profiles(username), comments(*, profiles(username))').eq('id', id).single();
    if (error || !data) { router.push('/dashboard'); return; }
    setArticle(data);

    const { data: reacts } = await supabase.from('reactions').select('*').eq('article_id', id);
    setCounts({
      likes: reacts?.filter(r => r.reaction_type === 'like').length || 0,
      dislikes: reacts?.filter(r => r.reaction_type === 'dislike').length || 0
    });
    
    if (authUser) {
      setUserReaction(reacts?.find(r => r.user_id === authUser.id)?.reaction_type || null);
    }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = async (type) => {
    if (!user) return alert("Sign in first!");
    if (userReaction === type) {
      await supabase.from('reactions').delete().match({ article_id: id, user_id: user.id });
    } else {
      await supabase.from('reactions').upsert({ article_id: id, user_id: user.id, reaction_type: type }, { onConflict: 'user_id, article_id' });
    }
    fetchData();
  };

  if (!article) return <div className="p-20 text-center font-black">Syncing...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white rounded-[3rem] border border-slate-200 p-8 md:p-12">
        <Link href="/dashboard" className="text-blue-600 font-black text-xs mb-8 inline-block uppercase tracking-widest">← Back to Hub</Link>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">
            {article.profiles?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-sm">@{article.profiles?.username}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase">Published {formatTimestamp(article.created_at)}</p>
          </div>
        </div>

        <h1 className="text-4xl font-black mb-8 leading-tight">{article.title}</h1>
        {article.image_url && <img src={article.image_url} className="w-full rounded-3xl mb-8 shadow-sm border border-slate-50" />}
        <p className="text-lg text-slate-700 leading-relaxed mb-12 whitespace-pre-wrap">{article.content}</p>

        <div className="flex gap-3 pb-12 border-b border-slate-50">
          <button onClick={() => handleReaction('like')} className={`px-8 py-3 rounded-full font-black text-xs transition-all ${userReaction === 'like' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {userReaction === 'like' ? '🔥 Helpful!' : '👍 Helpful'} ({counts.likes})
          </button>
          <button onClick={() => handleReaction('dislike')} className={`px-8 py-3 rounded-full font-black text-xs transition-all ${userReaction === 'dislike' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            👎 Not for me ({counts.dislikes})
          </button>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="bg-slate-100 px-8 py-3 rounded-full font-black text-xs text-slate-600">🔗 Copy Link</button>
        </div>

        <section className="mt-12">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2">💬 Discussion ({article.comments?.length || 0})</h3>
          <div className="space-y-4">
            {article.comments?.map(c => (
              <div key={c.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-black text-blue-700 mb-2">@{c.profiles?.username} • <span className="text-slate-400">{formatTimestamp(c.created_at)}</span></p>
                <p className="text-sm text-slate-700">{c.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}