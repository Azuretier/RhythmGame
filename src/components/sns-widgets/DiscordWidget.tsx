interface DiscordWidgetProps {
  config: {
    serverId?: string;
    theme?: 'light' | 'dark';
  };
}

export default function DiscordWidget({ config }: DiscordWidgetProps) {
  const { serverId = 'your-server-id', theme = 'dark' } = config;

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            D
          </div>
          <div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Discord Server
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                127 online
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wide`}>
            Text Channels
          </div>
          <div className="space-y-2">
            <div className={`p-2 rounded ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} cursor-pointer transition-colors`}>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}># general</span>
            </div>
            <div className={`p-2 rounded ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} cursor-pointer transition-colors`}>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}># announcements</span>
            </div>
            <div className={`p-2 rounded ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} cursor-pointer transition-colors`}>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}># community</span>
            </div>
          </div>
        </div>
        
        <a
          href={`https://discord.gg/${serverId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-center font-semibold transition-colors"
        >
          Join Discord Server
        </a>
      </div>
    </div>
  );
}
