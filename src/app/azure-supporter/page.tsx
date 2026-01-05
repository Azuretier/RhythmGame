"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const roles = {
  EN: {
    label: "English",
    flag: "🇺🇸",
    color: "from-blue-500 to-indigo-600",
    accent: "blue",
    description: "English speaking role"
  },
  JP: {
    label: "日本語",
    flag: "🇯🇵", 
    color: "from-red-500 to-pink-600",
    accent: "red",
    description: "Japanese speaking role"
  }
};

export default function AzureSupporterPage() {
  const searchParams = useSearchParams();
  const [discordUserId, setDiscordUserId] = useState<string | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<keyof typeof roles | null>(null);
  const [currentRole, setCurrentRole] = useState<keyof typeof roles | null>(null);
  const [status, setStatus] = useState<{ loading: boolean; error: string | null; success: boolean }>({ 
    loading: false, 
    error: null, 
    success: false 
  });
  const [isLoadingRole, setIsLoadingRole] = useState(false);

  useEffect(() => {
    // Check URL params for Discord user ID from OAuth callback
    const userIdParam = searchParams.get('discordUserId');
    const usernameParam = searchParams.get('discordUsername');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus({ loading: false, error: `Authentication error: ${errorParam}`, success: false });
      return;
    }

    if (userIdParam) {
      setDiscordUserId(userIdParam);
      setDiscordUsername(usernameParam);
      
      // Store in localStorage for future visits
      localStorage.setItem('discordUserId', userIdParam);
      if (usernameParam) {
        localStorage.setItem('discordUsername', usernameParam);
      }
    } else {
      // Try to load from localStorage
      const storedUserId = localStorage.getItem('discordUserId');
      const storedUsername = localStorage.getItem('discordUsername');
      if (storedUserId) {
        setDiscordUserId(storedUserId);
        setDiscordUsername(storedUsername);
      }
    }
  }, [searchParams]);

  // Fetch current role when user ID is available
  useEffect(() => {
    if (discordUserId) {
      fetchCurrentRole();
    }
  }, [discordUserId]);

  const fetchCurrentRole = async () => {
    if (!discordUserId) return;

    setIsLoadingRole(true);
    try {
      const res = await fetch(`/api/discord/assign-role?userId=${discordUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.currentRole) {
          setCurrentRole(data.currentRole as keyof typeof roles);
          setSelectedRole(data.currentRole as keyof typeof roles);
        }
      }
    } catch (err) {
      console.error('Error fetching current role:', err);
    } finally {
      setIsLoadingRole(false);
    }
  };

  const handleDiscordLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID_HERE';
    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 
      `${window.location.origin}/api/auth/discord/callback`
    );
    const scope = 'identify';
    
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  };

  const handleConfirm = async () => {
    if (!selectedRole || !discordUserId) return;
    
    setStatus({ loading: true, error: null, success: false });
    
    try {
      const res = await fetch('/api/discord/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: discordUserId, role: selectedRole })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign role');
      }
      
      setCurrentRole(selectedRole);
      setStatus({ loading: false, error: null, success: true });
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'An error occurred', 
        success: false 
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('discordUserId');
    localStorage.removeItem('discordUsername');
    setDiscordUserId(null);
    setDiscordUsername(null);
    setSelectedRole(null);
    setCurrentRole(null);
    setStatus({ loading: false, error: null, success: false });
  };

  // Not logged in view
  if (!discordUserId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-white">Azure Supporter</h1>
            <p className="text-gray-400">Select your language role for Discord</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4">
            <div className="text-5xl mb-4">🔗</div>
            <h2 className="text-xl font-semibold text-white">Connect Discord</h2>
            <p className="text-gray-400 text-sm">
              Link your Discord account to select your language role
            </p>
            
            <button
              onClick={handleDiscordLogin}
              className="w-full py-3 px-6 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Login with Discord
            </button>
          </div>

          {status.error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 text-sm">
              {status.error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Select Your Role</h1>
          {discordUsername && (
            <p className="text-gray-400">Logged in as <span className="text-white">{discordUsername}</span></p>
          )}
          {currentRole && !isLoadingRole && (
            <p className="text-sm text-gray-500">Current role: {roles[currentRole].label}</p>
          )}
        </div>
        
        {isLoadingRole ? (
          <div className="text-center text-gray-400">Loading current role...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(roles).map(([key, role]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRole(key as keyof typeof roles)}
                  disabled={status.loading}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedRole === key
                      ? `border-transparent bg-gradient-to-br ${role.color} scale-105 shadow-lg`
                      : "border-gray-800 bg-gray-900 hover:border-gray-700"
                  } ${status.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-4xl">{role.flag}</span>
                  <p className="text-lg font-semibold text-white mt-2">{role.label}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedRole || status.loading || selectedRole === currentRole}
              className={`w-full py-4 rounded-xl font-semibold transition-all ${
                selectedRole && !status.loading && selectedRole !== currentRole
                  ? `bg-gradient-to-r ${roles[selectedRole].color} text-white hover:opacity-90`
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              {status.loading ? "Syncing..." : status.success ? "✓ Role Assigned!" : 
               selectedRole === currentRole ? "Already Assigned" : "Confirm & Sync to Discord"}
            </button>
          </>
        )}
        
        {status.error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 text-sm">
            {status.error}
          </div>
        )}
        
        {status.success && (
          <div className="bg-green-900/20 border border-green-500 text-green-400 rounded-lg p-4 text-sm">
            Role successfully synced to Discord!
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Disconnect Discord
        </button>
      </div>
    </div>
  );
}