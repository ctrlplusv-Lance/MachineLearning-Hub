'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CommentModal({ article, onClose, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${article.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments', 
        filter: `article_id=eq.${article.id}` 
      }, () => fetchComments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [article.id]);

  const fetchComments = async () => {
    // UPDATED: Added avatar_url to the profile selection
    const { data } = await supabase
      .from('comments')
      .select(`*, profiles(username, avatar_url)`)
      .eq('article_id', article.id)
      .order('created_at', { ascending: true });
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
        parent_id: replyTo ? replyTo.id : null 
      }]);
    
    if (error) {
      console.error("Comment error:", error.message);
      alert(error.message);
    } else {
      setNewComment('');
      setReplyTo(null); 
      fetchComments(); 
    }
    setSending(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to remove this comment?")) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      alert("Error deleting comment: " + error.message);
    } else {
      fetchComments();
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4 transition-all">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="font-black text-slate-900 tracking-tight">Discussion</h3>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate max-w-[250px]">
              {article.title}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 transition-colors">✕</button>
        </div>
        
        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {rootComments.length === 0 && !sending && (
            <div className="text-center py-20">
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No signals yet</p>
            </div>
          )}
          
          {rootComments.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            return (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment Row */}
                <div className="flex gap-3 items-start group">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-slate-200 flex-shrink-0 shadow-sm">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] opacity-30">👤</div>
                    )}
                  </div>

                  <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm relative">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                        @{comment.profiles?.username || 'anonymous'}
                      </p>
                      {isOwner && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <span className="text-[10px]">🗑️</span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                    <button 
                      onClick={() => setReplyTo(comment)} 
                      className="mt-2 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline transition"
                    >
                      Reply
                    </button>
                  </div>
                </div>

                {/* Nested Replies */}
                {getReplies(comment.id).map(reply => {
                  const isReplyOwner = user?.id === reply.user_id;
                  return (
                    <div key={reply.id} className="ml-11 flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                        {reply.profiles?.avatar_url ? (
                          <img src={reply.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] opacity-30">👤</div>
                        )}
                      </div>
                      <div className="flex-1 bg-blue-50/50 p-3 rounded-xl rounded-tl-none border border-blue-100">
                        <div className="flex justify-between items-start">
                          <p className="text-[9px] font-black text-blue-600 uppercase">
                            @{reply.profiles?.username || 'anonymous'}
                          </p>
                          {isReplyOwner && (
                            <button onClick={() => handleDeleteComment(reply.id)} className="text-blue-300 hover:text-red-500 transition-colors scale-75">
                              🗑️
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium">{reply.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t bg-white pb-10 md:pb-6">
          {replyTo && (
            <div className="mb-3 flex justify-between items-center bg-blue-600 px-4 py-2 rounded-xl">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                Replying to @{replyTo.profiles?.username}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-white hover:opacity-50 transition">✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Type your reply..." : "Add to the discussion..."}
              className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-900 placeholder:text-slate-400"
            />
            <button 
              onClick={postComment} 
              disabled={sending || !newComment.trim()} 
              className="bg-blue-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-blue-200 flex items-center justify-center"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}