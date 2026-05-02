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

    // Realtime subscription updated to listen for ALL changes (INSERT and DELETE)
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
      .select(`*, profiles(username)`)
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
      fetchComments(); // Immediate refresh
    }
    setSending(false);
  };

  // NEW: Handle Delete Logic
  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to remove this comment?")) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id); // Ensure only the owner can delete

    if (error) {
      alert("Error deleting comment: " + error.message);
    } else {
      fetchComments(); // Refresh list after deletion
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Discussion</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{article.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition">✕</button>
        </div>
        
        {/* Comments List */}
        <div className="h-[400px] overflow-y-auto p-6 space-y-6 bg-white">
          {rootComments.length === 0 && !sending && (
            <p className="text-center text-slate-400 text-sm py-10">No comments yet. Start the conversation!</p>
          )}
          
          {rootComments.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            return (
              <div key={comment.id} className="space-y-4">
                {/* Main Comment */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                      @{comment.profiles?.username?.split('@')[0] || 'user'}
                    </p>
                    
                    {/* Delete Button for Main Comment */}
                    {isOwner && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete comment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                  
                  <button 
                    onClick={() => setReplyTo(comment)} 
                    className="mt-2 text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase transition"
                  >
                    Reply
                  </button>
                </div>

                {/* Nested Replies */}
                {getReplies(comment.id).map(reply => {
                  const isReplyOwner = user?.id === reply.user_id;
                  return (
                    <div key={reply.id} className="ml-8 bg-blue-50/40 p-3 rounded-2xl border-l-4 border-blue-200 relative">
                       <div className="flex justify-between items-start mb-1">
                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                           @{reply.profiles?.username?.split('@')[0] || 'user'}
                         </p>
                         
                         {/* Delete Button for Reply */}
                         {isReplyOwner && (
                           <button 
                             onClick={() => handleDeleteComment(reply.id)}
                             className="text-slate-300 hover:text-red-500 transition-colors scale-75"
                             title="Delete reply"
                           >
                             🗑️
                           </button>
                         )}
                       </div>
                       <p className="text-sm text-slate-700">{reply.content}</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t bg-slate-50">
          {replyTo && (
            <div className="mb-2 flex justify-between items-center bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200">
              <span className="text-[10px] font-bold text-blue-700">
                Replying to @{replyTo.profiles?.username?.split('@')[0]}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-blue-700 text-xs hover:bg-blue-200 rounded-full px-1">✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
              className="flex-1 bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 shadow-sm"
            />
            <button 
              onClick={postComment} 
              disabled={sending || !newComment.trim()} 
              className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-full font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-all active:scale-90 shadow-md"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}