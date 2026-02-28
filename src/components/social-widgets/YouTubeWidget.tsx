interface YouTubeWidgetProps {
  config: {
    channelId?: string;
    theme?: 'light' | 'dark';
  };
}

export default function YouTubeWidget({ config }: YouTubeWidgetProps) {
  const { channelId = 'your-channel-id', theme = 'dark' } = config;

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white text-xl font-bold">
            Y
          </div>
          <div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              YouTube Channel
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              1.2K subscribers
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="aspect-video bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-4xl">▶</span>
            </div>
            <div className="p-3">
              <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                Latest Video Title
              </p>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                1.5K views • 3 days ago
              </span>
            </div>
          </div>
        </div>
        
        <a
          href={`https://youtube.com/channel/${channelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-center font-semibold transition-colors"
        >
          Subscribe on YouTube
        </a>
      </div>
    </div>
  );
}
