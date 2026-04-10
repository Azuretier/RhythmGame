interface InstagramWidgetProps {
  config: {
    username?: string;
    theme?: 'light' | 'dark';
  };
}

export default function InstagramWidget({ config }: InstagramWidgetProps) {
  const { username = 'azuretier', theme = 'dark' } = config;

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center text-white font-bold">
            {username && username.length > 0 ? username[0].toUpperCase() : 'I'}
          </div>
          <div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              @{username}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              850 posts • 2.4K followers
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square bg-gradient-to-br from-purple-400 to-pink-500 rounded"
              />
            ))}
          </div>
        </div>
        
        <a
          href={`https://instagram.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-center font-semibold transition-all"
        >
          Follow on Instagram
        </a>
      </div>
    </div>
  );
}
