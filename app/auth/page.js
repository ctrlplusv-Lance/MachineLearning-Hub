'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // daad ang path, match sa lib folder
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Step 5: Sign Up logic [cite: 95, 96]
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`); // [cite: 98, 104]
    } else {
      setMessage('Registration successful! Check your email for a confirmation link.'); // [cite: 98]
    }
    setLoading(false);
  };

  // Step 5: Login logic [cite: 95, 97]
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`); // [cite: 98, 104]
    } else {
      setMessage('Login successful! Redirecting...'); // [cite: 98]
      // This sends the user to the dashboard after a successful login [cite: 55, 56]
      router.push('/dashboard'); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Account Access</h2>
        
        <form className="space-y-4">
          {/* Requirement: Email Field [cite: 49, 90] */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Requirement: Password Field [cite: 50, 91] */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="flex gap-4 pt-2">
            {/* Requirement: Login Button [cite: 52, 93] */}
            <button 
              type="button"
              onClick={handleLogin} 
              disabled={loading}
              className="flex-1 bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Login'}
            </button>

            {/* Requirement: Sign Up Button [cite: 51, 92] */}
            <button 
              type="button"
              onClick={handleSignUp} 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Sign Up
            </button>
          </div>
          
          {/* Requirement: Success/Error Messages [cite: 98, 104] */}
          {message && (
            <div className={`mt-4 p-3 text-center text-sm font-medium rounded-lg ${
              message.includes('Error') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </form>
        
        <p className="mt-6 text-center text-gray-500 text-xs">
          Developed by: Lance Ian E. Moquerio
        </p>
      </div>
    </div>
  );
}