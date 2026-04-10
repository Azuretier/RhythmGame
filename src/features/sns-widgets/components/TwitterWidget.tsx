interface TwitterWidgetProps {
  config: {
    username?: string;
    theme?: 'light' | 'dark';
  };
}

export default function TwitterWidget({ config }: TwitterWidgetProps) {
  const { username = 'azuretier', theme = 'dark' } = config;

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold`}>
            {username && username.length > 0 ? username[0].toUpperCase() : 'T'}
          </div>
          <div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              @{username}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Twitter Profile
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Check out my latest project! 🚀
            </p>
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>2 hours ago</span>
          </div>
          
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Working on something exciting! Stay tuned 👀
            </p>
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>1 day ago</span>
          </div>
        </div>
        
        <a
          href={`https://twitter.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-center font-semibold transition-colors"
        >
          Follow on Twitter
        </a>
      </div>
    </div>
  );
}
