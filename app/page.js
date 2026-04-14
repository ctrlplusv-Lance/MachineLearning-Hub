import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      {/* Requirement: Application Title */}
      <h1 className="text-5xl font-extrabold text-blue-900 mb-4">
        Machine Learning Hub
      </h1>
      
      {/* Requirement: Short Description */}
      <p className="text-lg text-slate-600 mb-8 max-w-lg">
        A simple integrated platform for exploring machine learning concepts. 
        Built with Next.js, secured by Supabase, and deployed on Vercel.
      </p>
      
      {/* Requirement: Button directing to Login/Sign-Up */}
      <Link href="/auth">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-full shadow-lg transition-all transform hover:scale-105">
          Get Started
        </button>
      </Link>
    </div>
  );
}