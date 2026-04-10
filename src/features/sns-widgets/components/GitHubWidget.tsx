interface GitHubWidgetProps {
  config: {
    username?: string;
    theme?: 'light' | 'dark';
  };
}

export default function GitHubWidget({ config }: GitHubWidgetProps) {
  const { username = 'azuretier', theme = 'dark' } = config;

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center text-white font-bold`}>
            {username && username.length > 0 ? username[0].toUpperCase() : 'G'}
          </div>
          <div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {username}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              25 repositories
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`font-semibold mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              awesome-project
            </div>
            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              A cool project description
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>⭐ 42</span>
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>TypeScript</span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`font-semibold mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              web-app
            </div>
            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Modern web application
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>⭐ 18</span>
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>React</span>
            </div>
          </div>
        </div>
        
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 w-full py-2 rounded-lg text-center font-semibold transition-colors ${
            theme === 'dark' 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-800 hover:bg-gray-900 text-white'
          }`}
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
