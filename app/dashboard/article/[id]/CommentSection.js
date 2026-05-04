'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CommentSection({ articleId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  useEffect(() => {
    fetchComments();
    
    const channel = supabase.channel(`repo-comments-${articleId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments', 
        filter: `article_id=eq.${articleId}` 
      }, fetchComments)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [articleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setLoading(true);
    const { error } = await supabase.from('comments').insert({
      article_id: articleId,
      user_id: user.id,
      content: newComment.trim()
    });

    if (!error) {
      setNewComment('');
      fetchComments();
    } else {
      console.error(error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId) => {
    if (!confirm("Remove this signal?")) return;
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) console.error(error.message);
    else fetchComments();
  };

  return (
    <div className="mt-16 pt-12 border-t border-slate-50 font-sans">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm">💬</span>
          Community Signals
        </h3>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          {comments.length} Thoughts
        </span>
      </div>

      {/* Premium Input Box */}
      <form onSubmit={handleSubmit} className="mb-14 relative group">
        <textarea
          className="w-full p-6 md:p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] focus:bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all resize-none font-medium text-slate-700 h-40 text-sm shadow-inner"
          placeholder="Analyze this discovery or add your findings..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="absolute bottom-6 right-6">
          <button 
            disabled={loading || !newComment.trim()}
            className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 shadow-xl shadow-slate-200"
          >
            {loading ? 'Transmitting...' : 'Post Signal ↑'}
          </button>
        </div>
      </form>

      {/* Signal List */}
      <div className="space-y-6">
        {comments.map((c) => {
          const isOwner = user?.id === c.user_id;
          return (
            <div key={c.id} className="group flex gap-5 p-5 md:p-8 rounded-[2.5rem] bg-white border border-slate-50 transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.04)] hover:-translate-y-0.5">
              
              {/* Avatar Squircle */}
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 shadow-sm">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-blue-600 uppercase text-xs">
                    {c.profiles?.username?.charAt(0) || '?'}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-[11px] text-slate-900 uppercase tracking-tight">@{c.profiles?.username || 'anonymous'}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {isOwner && (
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                    >
                      <span className="text-xs">🗑️</span>
                    </button>
                  )}
                </div>
                <p className="text-base text-slate-600 leading-relaxed font-medium opacity-90">{c.content}</p>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-24 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-5 text-xl">💬</div>
            <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">The thread is silent. Be the first to signal.</p>
          </div>
        )}
      </div>
    </div>
  );
}