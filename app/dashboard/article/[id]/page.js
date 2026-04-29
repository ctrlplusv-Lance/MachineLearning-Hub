'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';

export default function ArticleView() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      // Fetching specific article using the ID from the URL
      const { data, error } = await supabase
        .from('articles')
        .select(`*, profiles(username)`)
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        router.push('/dashboard');
      } else {
        setArticle(data);
      }
      setLoading(false);
    };

    if (id) fetchArticle();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-blue-900 font-bold animate-pulse">Loading Discovery...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push('/dashboard')} 
          className="mb-8 text-slate-500 hover:text-blue-600 font-bold transition flex items-center gap-2 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Hub
        </button>

        <article className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {article?.profiles?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-black text-blue-600 uppercase tracking-widest">
                @{article?.profiles?.username?.split('@')[0]}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Published in Discoveries
              </p>
            </div>
          </div>

          {/* High contrast Title */}
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
            {article?.title}
          </h1>

          {/* FIXED: Added Image Display Block */}
          {article?.image_url && (
            <div className="mb-10 overflow-hidden rounded-3xl border border-slate-100 shadow-lg">
              <img 
                src={article.image_url} 
                alt={article.title} 
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Darker content text to prevent the "invisible" look */}
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article?.content}
            </p>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4">
             <button className="bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 px-6 py-3 rounded-full font-bold text-sm transition">
               👍 Helpful
             </button>
             <button className="bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-600 px-6 py-3 rounded-full font-bold text-sm transition">
               🔗 Share Discovery
             </button>
          </div>
        </article>
      </div>
    </div>
  );
}