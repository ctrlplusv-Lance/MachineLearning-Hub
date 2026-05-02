'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Fetches both personal notifications and global ones (where user_id is null)
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, articles(title, image_url)')
      .or(`user_id.eq.${user.id},user_id.is.null`) 
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Filter out your own global "new_article" notifications so you don't see a duplicate 
    // of your own post alongside the "Success" notification.
    const myUsername = user.email?.split('@')[0];
    const filteredData = data?.filter(n => 
      !(n.type === 'new_article' && n.actor_usernames.includes(myUsername))
    );

    setNotifications(filteredData || []);
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase.channel(`notifs-combined`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        // Refresh if it's a global notification or intended for this specific user
        if (!payload.new.user_id || payload.new.user_id === user.id) {
          fetchNotifications();
        }
      })
      .subscribe();

    // Click-away listener to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user.id]);

  // Marks a specific notification as read in the database
  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    // Local state update for immediate feedback
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }
    setOpen(false);
    if (n.article_id) {
      router.push(`/dashboard/article/${n.article_id}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setOpen(!open)} 
        className={`relative p-2 rounded-full transition-all ${open ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-black px-1 border-2 border-white animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white shadow-2xl rounded-[2rem] border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-5 bg-slate-50/50 border-b flex justify-between items-center">
            <h4 className="font-black text-xs text-slate-500 uppercase tracking-widest">Notifications</h4>
            {unreadCount > 0 && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-300 text-3xl mb-2">✨</p>
                <p className="text-slate-400 text-sm italic">All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotifClick(n)}
                  className={`p-4 border-b border-slate-50 flex gap-3 items-start cursor-pointer hover:bg-blue-50/30 transition-all active:scale-[0.98] relative ${!n.is_read ? 'bg-blue-50/20' : ''}`}
                >
                  {/* Unread status bar */}
                  {!n.is_read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-full" />
                  )}

                  <div className="relative flex-shrink-0">
                    <img 
                      src={n.articles?.image_url || 'https://via.placeholder.com/100'} 
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" 
                      alt="Thumbnail"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm text-[10px]">
                      {n.type === 'author_success' ? '✅' : n.type === 'new_article' ? '📝' : '🔥'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 leading-snug mb-1">
                      {n.type === 'author_success' ? (
                        <>
                          <span className="font-black text-green-600">Success! </span>
                          You have successfully published: 
                        </>
                      ) : (
                        <>
                          <span className="font-black text-blue-900">
                            @{n.actor_usernames?.[0] || 'Someone'}
                          </span>
                          {n.type === 'new_article' ? ' posted a new discovery: ' : ' liked your discovery '}
                        </>
                      )}
                      <span className="font-bold text-slate-600 italic"> "{n.articles?.title || 'Deleted Article'}"</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}