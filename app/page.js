import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      {/* 1. Minimalist Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-100 bg-white/70 backdrop-blur-xl py-4 px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-200">
            🚀
          </div>
          <span className="font-black text-slate-900 uppercase tracking-tighter text-xl">
            ArtHub
          </span>
        </div>
        <Link href="/auth">
          <button className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
            Sign In
          </button>
        </Link>
      </nav>

      {/* 2. Hero Section */}
      <main className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-3xl">
          {/* Badge */}
          <span className="inline-block py-1.5 px-4 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-blue-100 shadow-sm">
            The Future of Social Art
          </span>

          {/* Main Title - Updated to ArtHub */}
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">
            The Canvas for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              Infinite Creators.
            </span>
          </h1>

          {/* Description */}
          <p className="text-slate-500 text-lg md:text-xl font-medium mb-12 max-w-xl mx-auto leading-relaxed">
            Experience the next generation of artistic discovery. Connect, share, and explore high-fidelity visual concepts in the definitive ArtHub environment.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth">
              <button className="bg-slate-900 hover:bg-blue-600 text-white font-black py-5 px-12 rounded-[2rem] shadow-2xl shadow-blue-900/10 transition-all transform hover:scale-105 active:scale-95 text-[12px] uppercase tracking-widest">
                Start Creating Now
              </button>
            </Link>
            <button className="bg-white border-2 border-slate-100 text-slate-500 font-black py-5 px-12 rounded-[2rem] transition-all hover:border-blue-200 hover:text-blue-600 text-[12px] uppercase tracking-widest">
              Explore Gallery
            </button>
          </div>
        </div>
      </main>

      {/* 3. Footer / Developer Credit */}
      <footer className="fixed bottom-0 w-full py-8 px-6 border-t border-slate-50 bg-white/50 backdrop-blur-sm flex flex-col items-center">
        <div className="flex items-center gap-4 mb-2">
           <div className="h-[1px] w-8 bg-slate-200" />
           <p className="text-slate-300 font-bold text-[9px] uppercase tracking-[0.3em]">
             System Developed By
           </p>
           <div className="h-[1px] w-8 bg-slate-200" />
        </div>
        <p className="text-slate-900 font-black text-[12px] uppercase tracking-widest">
          Lance Ian E. Moquerio
        </p>
      </footer>
    </div>
  );
}