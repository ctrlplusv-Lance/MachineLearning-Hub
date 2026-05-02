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
      .select('*, profiles:user_id(username)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  useEffect(() => {
    fetchComments();
    // Real-time: Listen for new comments
    const channel = supabase.channel(`repo-comments-${articleId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, fetchComments)
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
    }
    setLoading(false);
  };

  return (
    <div className="mt-12 pt-12 border-t border-slate-100">
      <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
        💬 Community Discussions
      </h3>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="mb-10 group">
        <textarea
          className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all resize-none font-medium text-slate-700 h-32"
          placeholder="Add your thoughts to this discovery..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button 
            disabled={loading || !newComment.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-blue-100"
          >
            {loading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-6">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-4 p-6 rounded-[2rem] hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
            <div className="w-10 h-10 bg-slate-200 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-slate-400 uppercase text-xs">
              {c.profiles?.username?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-xs text-blue-900 uppercase">@{c.profiles?.username || 'anonymous'}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase">
                   {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-10">
            <p className="text-slate-300 font-bold italic text-sm">No comments yet. Be the first to speak!</p>
          </div>
        )}
      </div>
    </div>
  );
}