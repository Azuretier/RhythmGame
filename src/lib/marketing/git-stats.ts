import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitStats {
  recentCommits: { hash: string; message: string; date: string }[];
  filesChanged: number;
  featureAreas: string[];
  summary: string;
}

const FEATURE_AREA_PATTERNS: Record<string, RegExp> = {
  rhythmia: /rhythmia|tetris|rhythm/i,
  arena: /arena/i,
  'tower-defense': /tower.?def|galaxy.?td/i,
  'minecraft-board': /minecraft.?board|board.?game/i,
  'minecraft-world': /minecraft.?world|voxel/i,
  'minecraft-switch': /minecraft.?switch|switch.?edition/i,
  rpg: /echoes|eternity|rpg/i,
  shop: /shop|store|purchase/i,
  profile: /profile|skin|theme/i,
  multiplayer: /multiplayer|socket|websocket/i,
  ui: /ui|component|layout|page/i,
  infra: /deploy|ci|config|build|lint/i,
};

function detectFeatureAreas(commits: { message: string }[], changedFiles: string[]): string[] {
  const areas = new Set<string>();

  const allText = [
    ...commits.map((c) => c.message),
    ...changedFiles,
  ].join(' ');

  for (const [area, pattern] of Object.entries(FEATURE_AREA_PATTERNS)) {
    if (pattern.test(allText)) {
      areas.add(area);
    }
  }

  return Array.from(areas);
}

export async function getRecentGitStats(days = 1): Promise<GitStats> {
  const since = `${days} days ago`;

  try {
    const [logResult, diffResult] = await Promise.all([
      execAsync(`git log --since="${since}" --pretty=format:"%H|||%s|||%aI" --no-merges`, {
        maxBuffer: 1024 * 1024,
      }),
      execAsync(`git diff --stat HEAD~20 --name-only 2>/dev/null || echo ""`, {
        maxBuffer: 1024 * 1024,
      }),
    ]);

    const recentCommits = logResult.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, message, date] = line.split('|||');
        return { hash: hash.slice(0, 8), message, date };
      });

    const changedFiles = diffResult.stdout.split('\n').filter(Boolean);
    const filesChanged = changedFiles.length;
    const featureAreas = detectFeatureAreas(recentCommits, changedFiles);

    const summary = recentCommits.length > 0
      ? `${recentCommits.length} commits in the last ${days} day(s) touching ${filesChanged} files. Areas: ${featureAreas.join(', ') || 'general'}.`
      : `No commits in the last ${days} day(s).`;

    return { recentCommits, filesChanged, featureAreas, summary };
  } catch (error) {
    console.error('[Marketing] Git stats extraction failed:', error);
    return {
      recentCommits: [],
      filesChanged: 0,
      featureAreas: [],
      summary: 'Could not extract git stats.',
    };
  }
}
