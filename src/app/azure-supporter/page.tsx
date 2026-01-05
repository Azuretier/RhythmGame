"use client";


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

export default function RoleSelector({ discordUserId }: { discordUserId: string }) {
  const [selectedRole, setSelectedRole] = useState<keyof typeof roles | null>(null);
  const [status, setStatus] = useState<{ loading: boolean; error: string | null; success: boolean }>({ loading: false, error: null, success: false });

  const handleConfirm = async () => {
    if (!selectedRole || !discordUserId) return;
    
    setStatus({ loading: true, error: null, success: false });
    
    try {
      const res = await fetch('http://localhost:3001/api/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: discordUserId, role: selectedRole })
      });
      
      if (!res.ok) throw new Error('Failed to assign role');
      
      setStatus({ loading: false, error: null, success: true });
    } catch (err) {
      setStatus({ loading: false, error: err instanceof Error ? err.message : 'An error occurred', success: false });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">Select Your Role</h1>
        
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(roles).map(([key, role]) => (
            <button
              key={key}
              onClick={() => setSelectedRole(key as keyof typeof roles)}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedRole === key
                  ? `border-transparent bg-gradient-to-br ${role.color} scale-105`
                  : "border-gray-800 bg-gray-900 hover:border-gray-700"
              }`}
            >
              <span className="text-4xl">{role.flag}</span>
              <p className="text-lg font-semibold text-white mt-2">{role.label}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedRole || status.loading}
          className={`w-full py-4 rounded-xl font-semibold transition-all ${
            selectedRole && !status.loading
              ? `bg-gradient-to-r ${roles[selectedRole].color} text-white`
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          }`}
        >
          {status.loading ? "Syncing..." : status.success ? "✓ Role Assigned!" : "Confirm & Sync to Discord"}
        </button>
        
        {status.error && <p className="text-red-500 text-center">{status.error}</p>}
        {status.success && <p className="text-green-500 text-center">Role synced to Discord!</p>}
      </div>
    </div>
  );
}