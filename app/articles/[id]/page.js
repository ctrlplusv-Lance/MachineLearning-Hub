import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export async function generateMetadata({ params }) {
  const { data: article } = await supabase
    .from('articles')
    .select('title, content')
    .eq('id', params.id)
    .single();

  return {
    title: article?.title || "ML Hub Discovery",
    description: article?.content?.substring(0, 160) || "Read this discovery on ML Hub.",
  };
}

export default async function PublicArticlePage({ params }) {
  const { id } = params;

  // Fetch article data for anyone with the link
  const { data: article, error } = await supabase
    .from('articles')
    .select(`
      *,
      profiles (username)
    `)
    .eq('id', id)
    .single();

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Article not found</h1>
          <Link href="/" className="text-blue-600 hover:underline mt-4 block">Return Home</Link>
        </div>
      </div>
    );
  }

  const rawName = article.profiles?.username || 'anonymous';
  const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-12">
      <article className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-12">
          <header className="mb-8">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-6 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex items-center gap-3 py-4 border-y border-slate-100">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm">@{displayName}</p>
                <p className="text-slate-400 text-xs">
                  Published on {new Date(article.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </header>

          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-lg whitespace-pre-wrap">
            {article.content}
          </div>

          <footer className="mt-12 pt-8 border-t border-slate-100">
            <div className="bg-blue-50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-blue-900 font-semibold text-center sm:text-left">
                Enjoyed this discovery? Join ML Hub to join the discussion.
              </p>
              <Link 
                href="/auth" 
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                Sign Up Free
              </Link>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}