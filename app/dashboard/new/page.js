"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewArticle() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('articles')
      .insert([{ 
        title, 
        content, 
        author_id: user.id 
      }]);

    if (!error) {
      router.push('/dashboard');
      router.refresh(); // This updates the Top 5 list instantly
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-10 space-y-4">
      <h1 className="text-2xl font-bold">Write an Article</h1>
      <input 
        className="w-full p-2 border rounded"
        placeholder="Title"
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea 
        className="w-full p-2 border rounded h-40"
        placeholder="Write your content here..."
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Publish</button>
    </form>
  );
}