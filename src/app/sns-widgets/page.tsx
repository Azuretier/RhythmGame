'use client';

import { useState } from 'react';
import { FaTwitter, FaDiscord, FaYoutube, FaInstagram, FaGithub } from 'react-icons/fa';
import TwitterWidget from '@/components/sns-widgets/TwitterWidget';
import DiscordWidget from '@/components/sns-widgets/DiscordWidget';
import YouTubeWidget from '@/components/sns-widgets/YouTubeWidget';
import InstagramWidget from '@/components/sns-widgets/InstagramWidget';
import GitHubWidget from '@/components/sns-widgets/GitHubWidget';

type WidgetType = 'twitter' | 'discord' | 'youtube' | 'instagram' | 'github';

interface WidgetConfig {
  id: WidgetType;
  name: string;
  icon: JSX.Element;
  enabled: boolean;
  config: {
    username?: string;
    serverId?: string;
    channelId?: string;
    theme?: 'light' | 'dark';
  };
}

export default function SNSWidgetsPage() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: <FaTwitter className="w-6 h-6" />,
      enabled: true,
      config: { username: 'azuretier', theme: 'dark' },
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: <FaDiscord className="w-6 h-6" />,
      enabled: true,
      config: { serverId: 'your-server-id', theme: 'dark' },
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <FaYoutube className="w-6 h-6" />,
      enabled: true,
      config: { channelId: 'your-channel-id', theme: 'dark' },
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <FaInstagram className="w-6 h-6" />,
      enabled: true,
      config: { username: 'azuretier', theme: 'dark' },
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <FaGithub className="w-6 h-6" />,
      enabled: true,
      config: { username: 'azuretier', theme: 'dark' },
    },
  ]);

  const [selectedWidget, setSelectedWidget] = useState<WidgetType | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  const toggleWidget = (id: WidgetType) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const updateWidgetConfig = (id: WidgetType, config: Partial<WidgetConfig['config']>) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, config: { ...w.config, ...config } } : w
    ));
  };

  const generateEmbedCode = (widget: WidgetConfig) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://azuretier.net';
    const params = new URLSearchParams();
    Object.entries(widget.config).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    return `<iframe src="${baseUrl}/sns-widgets/embed/${widget.id}?${params.toString()}" width="350" height="500" style="border: 0;" scrolling="no"></iframe>`;
  };

  const renderWidget = (widget: WidgetConfig) => {
    if (!widget.enabled) return null;

    switch (widget.id) {
      case 'twitter':
        return <TwitterWidget config={widget.config} />;
      case 'discord':
        return <DiscordWidget config={widget.config} />;
      case 'youtube':
        return <YouTubeWidget config={widget.config} />;
      case 'instagram':
        return <InstagramWidget config={widget.config} />;
      case 'github':
        return <GitHubWidget config={widget.config} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-lg bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            SNS Widgets
          </h1>
          <p className="mt-2 text-gray-300">
            Embeddable social media widgets for your website
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Widget Controls */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Available Widgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  widget.enabled
                    ? 'bg-white/10 border-blue-400 backdrop-blur'
                    : 'bg-black/20 border-gray-600'
                }`}
                onClick={() => setSelectedWidget(widget.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {widget.icon}
                    <span className="font-semibold">{widget.name}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleWidget(widget.id);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        {selectedWidget && (
          <div className="mb-8 p-6 rounded-lg bg-white/10 backdrop-blur border border-white/20">
            <h3 className="text-xl font-semibold mb-4">
              Configure {widgets.find(w => w.id === selectedWidget)?.name}
            </h3>
            <div className="space-y-4">
              {selectedWidget === 'twitter' && (
                <input
                  type="text"
                  placeholder="Username"
                  value={widgets.find(w => w.id === selectedWidget)?.config.username || ''}
                  onChange={(e) => updateWidgetConfig(selectedWidget, { username: e.target.value })}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                />
              )}
              {selectedWidget === 'discord' && (
                <input
                  type="text"
                  placeholder="Server ID"
                  value={widgets.find(w => w.id === selectedWidget)?.config.serverId || ''}
                  onChange={(e) => updateWidgetConfig(selectedWidget, { serverId: e.target.value })}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                />
              )}
              {selectedWidget === 'youtube' && (
                <input
                  type="text"
                  placeholder="Channel ID"
                  value={widgets.find(w => w.id === selectedWidget)?.config.channelId || ''}
                  onChange={(e) => updateWidgetConfig(selectedWidget, { channelId: e.target.value })}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                />
              )}
              {(selectedWidget === 'instagram' || selectedWidget === 'github') && (
                <input
                  type="text"
                  placeholder="Username"
                  value={widgets.find(w => w.id === selectedWidget)?.config.username || ''}
                  onChange={(e) => updateWidgetConfig(selectedWidget, { username: e.target.value })}
                  className="w-full px-4 py-2 rounded bg-black/40 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                />
              )}
              <button
                onClick={() => setShowEmbedCode(!showEmbedCode)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                {showEmbedCode ? 'Hide' : 'Show'} Embed Code
              </button>
              {showEmbedCode && (
                <div className="mt-4">
                  <textarea
                    readOnly
                    value={generateEmbedCode(widgets.find(w => w.id === selectedWidget)!)}
                    className="w-full h-24 px-4 py-2 rounded bg-black/60 border border-white/20 text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateEmbedCode(widgets.find(w => w.id === selectedWidget)!));
                    }}
                    className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widget Preview */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Widget Preview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widgets.filter(w => w.enabled).map((widget) => (
              <div key={widget.id} className="rounded-lg overflow-hidden bg-white/5 backdrop-blur border border-white/10">
                <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-black/30">
                  {widget.icon}
                  <span className="font-semibold">{widget.name}</span>
                </div>
                <div className="p-4">
                  {renderWidget(widget)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
