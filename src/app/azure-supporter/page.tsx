import { useState } from "react";

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

export default function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (role) => {
    setSelectedRole(role);
    setConfirmed(false);
  };

  const handleConfirm = () => {
    if (selectedRole) {
      setConfirmed(true);
      // You can add your callback/navigation here
      console.log(`Role confirmed: ${selectedRole}`);
    }
  };

  const handleReset = () => {
    setSelectedRole(null);
    setConfirmed(false);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r ${roles[selectedRole].color} text-white text-2xl font-bold shadow-2xl`}>
            <span className="text-4xl">{roles[selectedRole].flag}</span>
            <span>{roles[selectedRole].label} Role</span>
          </div>
          <p className="text-gray-400">Role selected successfully</p>
          <button
            onClick={handleReset}
            className="px-6 py-2 text-sm text-gray-500 hover:text-white transition-colors underline underline-offset-4"
          >
            Change selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Select Your Role</h1>
          <p className="text-gray-500">Choose your preferred language role</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(roles).map(([key, role]) => {
            const isSelected = selectedRole === key;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`
                  relative group p-6 rounded-2xl border-2 transition-all duration-300
                  ${isSelected 
                    ? `border-transparent bg-gradient-to-br ${role.color} shadow-xl shadow-${role.accent}-500/30 scale-105` 
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800"
                  }
                `}
              >
                <div className="space-y-3">
                  <span className="text-5xl block">{role.flag}</span>
                  <div>
                    <p className={`text-xl font-bold ${isSelected ? "text-white" : "text-gray-200"}`}>
                      {role.label}
                    </p>
                    <p className={`text-sm ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                      {role.description}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedRole}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
            ${selectedRole
              ? `bg-gradient-to-r ${roles[selectedRole].color} text-white hover:opacity-90 shadow-lg`
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }
          `}
        >
          {selectedRole ? `Confirm ${roles[selectedRole].label} Role` : "Select a role"}
        </button>
      </div>
    </div>
  );
}