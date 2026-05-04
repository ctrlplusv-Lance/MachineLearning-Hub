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
    } else {
      setNewComment('');
      setReplyTo(null); 
      fetchComments(); 
    }
    setSending(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Remove this signal from the discussion?")) return;
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (!error) fetchComments();
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-6 transition-all">
      <div className="bg-white w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-500 max-h-[92vh] flex flex-col border border-white/20">
        
        {/* Editorial Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tighter">Discussion Thread</h3>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] truncate max-w-[280px] opacity-70">
              Regarding: {article.title}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-900 transition-all active:scale-90"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
        
        {/* Comments Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/30">
          {rootComments.length === 0 && !sending && (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">No signals detected</p>
            </div>
          )}
          
          {rootComments.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            const replies = getReplies(comment.id);

            return (
              <div key={comment.id} className="space-y-4">
                {/* Main Post Card style comment */}
                <div className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-slate-100 flex-shrink-0 shadow-sm">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs bg-slate-50 text-slate-300 font-black">
                        {comment.profiles?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                        @{comment.profiles?.username || 'anonymous'}
                      </p>
                      <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                    </div>

                    <div className="flex items-center gap-4 pt-1 px-1">
                      <button 
                        onClick={() => setReplyTo(comment)} 
                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-indigo-600 transition"
                      >
                        Reply
                      </button>
                      {isOwner && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Styled Replies */}
                {replies.map(reply => {
                  const isReplyOwner = user?.id === reply.user_id;
                  return (
                    <div key={reply.id} className="ml-14 flex gap-3 items-start border-l-2 border-slate-100 pl-4 py-1">
                      <div className="w-7 h-7 rounded-xl overflow-hidden bg-white border border-slate-100 flex-shrink-0 shadow-sm">
                        {reply.profiles?.avatar_url ? (
                          <img src={reply.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] bg-slate-50 text-slate-300">👤</div>
                        )}
                      </div>
                      <div className="flex-1 bg-white/50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-black text-slate-700 uppercase">
                            @{reply.profiles?.username || 'anonymous'}
                          </p>
                          {isReplyOwner && (
                            <button onClick={() => handleDeleteComment(reply.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                              <span className="text-[10px]">✕</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{reply.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Premium Input Area */}
        <div className="p-6 md:p-8 border-t border-slate-50 bg-white pb-12 md:pb-8">
          {replyTo && (
            <div className="mb-4 flex justify-between items-center bg-slate-900 px-5 py-2.5 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">
                Replying to <span className="text-blue-400">@{replyTo.profiles?.username}</span>
              </span>
              <button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white transition">✕</button>
            </div>
          )}
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Compose reply..." : "Add your signal..."}
              className="flex-1 bg-transparent border-none px-4 py-2 text-sm font-bold outline-none text-slate-900 placeholder:text-slate-300"
            />
            <button 
              onClick={postComment} 
              disabled={sending || !newComment.trim()} 
              className="bg-blue-600 text-white w-12 h-12 rounded-full font-black text-[10px] uppercase transition-all active:scale-90 shadow-lg shadow-blue-200 flex items-center justify-center disabled:bg-slate-200 disabled:shadow-none"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">↑</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}