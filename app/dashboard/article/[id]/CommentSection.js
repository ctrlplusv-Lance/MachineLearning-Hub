'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CommentSection({ articleId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    // UPDATED: Now fetches avatar_url as well
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  useEffect(() => {
    fetchComments();
    
    // Real-time: Listen for all changes (inserts/deletes)
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
      alert(error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) alert(error.message);
    else fetchComments();
  };

  return (
    <div className="mt-12 pt-12 border-t border-slate-100 font-sans">
      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
        💬 Community Discussions
      </h3>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="mb-12 group">
        <div className="relative">
          <textarea
            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all resize-none font-medium text-slate-700 h-32 text-sm shadow-inner"
            placeholder="Add your thoughts to this discovery..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="absolute bottom-4 right-4">
            <button 
              disabled={loading || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-blue-100"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-4">
        {comments.map((c) => {
          const isOwner = user?.id === c.user_id;
          return (
            <div key={c.id} className="flex gap-4 p-4 md:p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
              {/* Avatar Support */}
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0 shadow-sm">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-blue-600 uppercase text-xs">
                    {c.profiles?.username?.charAt(0) || '?'}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-black text-[10px] text-blue-600 uppercase tracking-tight">@{c.profiles?.username || 'anonymous'}</span>
                    <span className="ml-3 text-[9px] font-bold text-slate-300 uppercase">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {isOwner && (
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <span className="text-xs">🗑️</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.content}</p>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No signals detected. Start the conversation!</p>
          </div>
        )}
      </div>
    </div>
  );
}