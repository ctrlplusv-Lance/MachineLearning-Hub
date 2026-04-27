'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CommentModal({ article, onClose, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // Tracks who we are replying to

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`comments-${article.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments', 
        filter: `article_id=eq.${article.id}` 
      }, () => fetchComments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [article.id]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`*, profiles(username)`)
      .eq('article_id', article.id)
      .order('created_at', { ascending: true }); // Ascending works better for conversations
    setComments(data || []);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    
    const { error } = await supabase
      .from('comments')
      .insert([{ 
        article_id: article.id, 
        user_id: user.id, 
        content: newComment.trim(),
        parent_id: replyTo ? replyTo.id : null // Links the reply
      }]);
    
    if (error) alert(error.message);
    else {
      setNewComment('');
      setReplyTo(null); // Reset reply mode
    }
    setSending(false);
  };

  // Helper to group replies under their parents
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Discussion</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{article.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400">✕</button>
        </div>
        
        <div className="h-[400px] overflow-y-auto p-6 space-y-6 bg-white">
          {rootComments.map((comment) => (
            <div key={comment.id} className="space-y-4">
              {/* Main Comment */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-blue-600 mb-1 uppercase">@{comment.profiles?.username?.split('@')[0]}</p>
                <p className="text-sm text-slate-700">{comment.content}</p>
                <button 
                  onClick={() => setReplyTo(comment)}
                  className="mt-2 text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-tight"
                >
                  Reply
                </button>
              </div>

              {/* Indented Replies */}
              {getReplies(comment.id).map(reply => (
                <div key={reply.id} className="ml-8 bg-blue-50/50 p-3 rounded-2xl border-l-4 border-blue-200">
                   <p className="text-[10px] font-black text-blue-400 mb-1 uppercase">@{reply.profiles?.username?.split('@')[0]}</p>
                   <p className="text-sm text-slate-700">{reply.content}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="p-6 border-t bg-slate-50">
          {replyTo && (
            <div className="mb-2 flex justify-between items-center bg-blue-100 px-3 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-blue-700">Replying to @{replyTo.profiles?.username?.split('@')[0]}</span>
              <button onClick={() => setReplyTo(null)} className="text-blue-700 text-xs">✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
              className="flex-1 bg-white border border-slate-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={postComment}
              disabled={sending || !newComment.trim()}
              className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-full font-bold hover:bg-blue-700 disabled:bg-slate-300 transition"
            >
              {sending ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}