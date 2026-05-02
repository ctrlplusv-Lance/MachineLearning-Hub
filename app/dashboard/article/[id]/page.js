'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// In Next.js App Router, params is a Promise that must be unwrapped
export default function ArticleView({ params: paramsPromise }) {
  // 1. Unwrap the params to get the ID
  const params = use(paramsPromise);
  const id = params.id;
  
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      // 2. Fetch the article with the author's username
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          profiles:author_id (
            username
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Fetch Error:", error.message);
        router.push('/dashboard');
      } else {
        setArticle(data);
        window.scrollTo(0, 0); // Reset scroll to top
      }
      setLoading(false);
    };

    if (id) fetchArticle();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-900 font-black animate-pulse uppercase tracking-widest text-xs">Syncing Discovery...</p>
      </div>
    </div>
  );

  // If article not found after loading
  if (!article) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => router.push('/dashboard')} 
          className="mb-8 text-slate-400 hover:text-blue-600 font-black text-xs uppercase tracking-widest transition flex items-center gap-2 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Hub
        </button>

        {/* Main Content */}
        <article className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200">
          
          {/* Header / Author info */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-200 uppercase">
              {article?.profiles?.username?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-black text-blue-900 uppercase tracking-tight">
                @{article?.profiles?.username || 'anonymous'}
              </p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                {article?.created_at ? new Date(article.created_at).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : 'Recent'} • Public Discovery
              </p>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
            {article?.title}
          </h1>

          {/* Featured Image */}
          {article?.image_url && (
            <div className="mb-10 overflow-hidden rounded-[2rem] border border-slate-100 shadow-xl bg-slate-50">
              <img 
                src={article.image_url} 
                alt={article.title} 
                className="w-full h-auto max-h-[700px] object-contain mx-auto"
              />
            </div>
          )}

          {/* Article Text */}
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {article?.content}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-wrap gap-4">
             <button className="flex-1 md:flex-none bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-transparent hover:border-orange-100">
               🔥 Helpful Discovery
             </button>
             <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }}
              className="flex-1 md:flex-none bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-transparent hover:border-blue-100"
             >
               🔗 Copy Link
             </button>
          </div>
        </article>
      </div>
    </div>
  );
}