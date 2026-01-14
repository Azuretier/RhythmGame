'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { discordFirestore } from '@/lib/discord-community/firestore-client';
import type { UserProfile } from '@/lib/discord-community/types';
import { xpProgress, getRankColor } from '@/lib/discord-community/types';

export default function AzureCommunityProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await discordFirestore.getUserProfile(userId);
        if (data) {
          setProfile(data);
        } else {
          setError('Profile not found');
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-purple-200">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Profile Not Found</h1>
          <p className="text-purple-200">{error || 'The requested profile does not exist.'}</p>
          <p className="text-purple-300 mt-2">Make sure the user has sent a message in the Discord server first.</p>
        </div>
      </div>
    );
  }

  const progress = xpProgress(profile.xp);
  const rankColor = getRankColor(profile.rank);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-purple-500/20">
          {/* Header */}
          <div className="relative h-48 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute -bottom-16 left-8">
              <div className="relative">
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="w-32 h-32 rounded-full border-4 border-slate-800 shadow-xl"
                />
                <div 
                  className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-slate-800 shadow-lg"
                  style={{ backgroundColor: rankColor }}
                >
                  {profile.level}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 px-8 pb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {profile.username}
                  {profile.discriminator && <span className="text-purple-400">#{profile.discriminator}</span>}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 rounded-full text-white font-semibold" style={{ backgroundColor: rankColor }}>
                    {profile.rank.toUpperCase()}
                  </span>
                  {profile.rulesAgreed && (
                    <span className="px-3 py-1 rounded-full bg-green-600 text-white font-semibold">
                      ✓ Rules Agreed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{profile.level}</div>
                <div className="text-sm text-purple-200">Level</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{profile.xp.toLocaleString()}</div>
                <div className="text-sm text-purple-200">Total XP</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{profile.messageCount || 0}</div>
                <div className="text-sm text-purple-200">Messages</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{profile.roles.length}</div>
                <div className="text-sm text-purple-200">Roles</div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="mt-8">
              <div className="flex justify-between text-sm text-purple-200 mb-2">
                <span>Progress to Level {profile.level + 1}</span>
                <span>{progress.current.toLocaleString()} / {progress.required.toLocaleString()} XP</span>
              </div>
              <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-purple-300 mt-1">
                {progress.percentage.toFixed(1)}% Complete
              </div>
            </div>

            {/* Roles */}
            {profile.roles.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">Custom Roles</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role, index) => (
                    <span 
                      key={index}
                      className="px-4 py-2 bg-purple-600/30 border border-purple-500/50 rounded-lg text-purple-200 text-sm font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="mt-8 pt-8 border-t border-purple-500/20">
              <p className="text-purple-300 text-sm">
                Member since {new Date(profile.joinedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-4">About Azure Community</h2>
          <p className="text-purple-200 leading-relaxed">
            This is the community profile for {profile.username}. Gain XP by participating in the Discord server, 
            level up, unlock new ranks, and customize your roles. Join the conversation and be part of our growing community!
          </p>
        </div>
      </div>
    </div>
  );
}
