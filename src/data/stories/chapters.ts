export interface DialogueLine {
    speaker: string | null; // null = narration
    text: string;
    textEn?: string;
    speakerEn?: string;
}

export interface StoryScene {
    id: string;
    background: string; // CSS gradient or color
    characterVisible: boolean;
    characterPosition?: 'center' | 'left' | 'right';
    particleType?: 'butterflies' | 'petals' | 'fireflies' | 'snow' | 'stars';
    dialogue: DialogueLine[];
}

export interface Chapter {
    id: string;
    number: number;
    title: string;
    titleEn: string;
    subtitle: string;
    accent: string;
    scenes: StoryScene[];
}

export const CHAPTERS: Chapter[] = [
    {
        id: 'awakening',
        number: 1,
        title: '目覚め',
        titleEn: 'Awakening',
        subtitle: 'The Beginning',
        accent: '#4CAF50',
        scenes: [
            {
                id: 'forest-morning',
                background: 'linear-gradient(180deg, #1a3a1a 0%, #2d5a2d 20%, #3a7a3a 40%, #4a8a4a 60%, #2d5a2d 80%, #1a3a1a 100%)',
                characterVisible: false,
                particleType: 'butterflies',
                dialogue: [
                    {
                        speaker: null,
                        text: '――深い森の奥、朝靄が木々の間を漂っていた。',
                        textEn: '— Deep in the forest, morning mist drifted between the trees.',
                    },
                    {
                        speaker: null,
                        text: '鳥たちの歌声が、静寂を優しく破る。',
                        textEn: 'The songs of birds gently broke the silence.',
                    },
                    {
                        speaker: null,
                        text: 'やがて、一筋の光が差し込んだ。',
                        textEn: 'Before long, a single ray of light shone through.',
                    },
                ],
            },
            {
                id: 'forest-encounter',
                background: 'linear-gradient(180deg, #0f2b0f 0%, #1a4a2a 25%, #2a6a3a 50%, #3a8a4a 70%, #2a5a35 90%, #1a3a25 100%)',
                characterVisible: true,
                characterPosition: 'center',
                particleType: 'butterflies',
                dialogue: [
                    {
                        speaker: null,
                        text: '光の中に、少女の姿があった。',
                        textEn: 'In the light, there stood the figure of a girl.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: '……あなたは、ここに来るのは初めて？',
                        textEn: '...Is this your first time here?',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'この森は、リズムで満ちている。聴こえるでしょう？',
                        textEn: 'This forest is filled with rhythm. Can you hear it?',
                    },
                    {
                        speaker: null,
                        text: '彼女の言葉に耳を澄ますと、確かに――風の中に、かすかな旋律が聴こえた。',
                        textEn: 'Listening closely to her words, you could indeed hear it — a faint melody within the wind.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'リズミアの世界へようこそ。私と一緒に、この世界の鼓動を感じてみない？',
                        textEn: 'Welcome to the world of Rhythmia. Would you like to feel the heartbeat of this world with me?',
                    },
                ],
            },
            {
                id: 'forest-path',
                background: 'linear-gradient(180deg, #1a3a2a 0%, #2a5a3a 30%, #3a7a4a 50%, #4a9a5a 70%, #3a7a4a 90%, #1a3a2a 100%)',
                characterVisible: true,
                characterPosition: 'right',
                particleType: 'petals',
                dialogue: [
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'ついてきて。道を案内するわ。',
                        textEn: 'Follow me. I\'ll show you the way.',
                    },
                    {
                        speaker: null,
                        text: '少女は微笑み、光の射す方へ歩き始めた。',
                        textEn: 'The girl smiled and began walking toward where the light shone.',
                    },
                    {
                        speaker: null,
                        text: '足元の落ち葉が、まるでリズムを刻むように音を立てる。',
                        textEn: 'The fallen leaves underfoot made sounds as if marking a rhythm.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'この先に、メロディアの村がある。そこが最初の目的地よ。',
                        textEn: 'Beyond here lies the village of Melodia. That\'s our first destination.',
                    },
                ],
            },
        ],
    },
    {
        id: 'melodia',
        number: 2,
        title: 'メロディア',
        titleEn: 'Melodia',
        subtitle: 'The First Beat',
        accent: '#2196F3',
        scenes: [
            {
                id: 'village-entrance',
                background: 'linear-gradient(180deg, #1a2a4a 0%, #2a3a6a 25%, #3a4a8a 45%, #4a5a9a 60%, #3a4a7a 80%, #1a2a4a 100%)',
                characterVisible: true,
                characterPosition: 'left',
                particleType: 'fireflies',
                dialogue: [
                    {
                        speaker: null,
                        text: '森を抜けると、青い光に包まれた村が広がっていた。',
                        textEn: 'Beyond the forest, a village bathed in blue light spread before them.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'ここがメロディア。リズミアで最初に生まれた村。',
                        textEn: 'This is Melodia. The first village born in Rhythmia.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'この村の人たちは、音楽と共に生きている。すべての行動にリズムがあるの。',
                        textEn: 'The people of this village live with music. There\'s rhythm in everything they do.',
                    },
                    {
                        speaker: null,
                        text: '村の中心から、柔らかなビートが響いてくる。それは心臓の鼓動のように、温かく力強かった。',
                        textEn: 'A soft beat resonated from the village center. It was warm and powerful, like a heartbeat.',
                    },
                ],
            },
            {
                id: 'village-heart',
                background: 'radial-gradient(ellipse at 50% 60%, #2a4a8a 0%, #1a3a6a 40%, #0f2a4a 80%, #0a1a3a 100%)',
                characterVisible: true,
                characterPosition: 'center',
                particleType: 'stars',
                dialogue: [
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'あの光を見て。あれがリズムコア――この世界を動かす力の源。',
                        textEn: 'Look at that light. That\'s the Rhythm Core — the source of power that drives this world.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'でも最近、そのリズムが乱れ始めている……。',
                        textEn: 'But lately, that rhythm has started to falter...',
                    },
                    {
                        speaker: null,
                        text: '彼女の瞳に、かすかな影がよぎった。',
                        textEn: 'A faint shadow crossed her eyes.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'だからこそ、あなたが必要なの。リズムを取り戻す力を持つ人が。',
                        textEn: 'That\'s exactly why I need you. Someone who has the power to restore the rhythm.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: '……一緒に、この世界を救ってくれる？',
                        textEn: '...Will you save this world with me?',
                    },
                ],
            },
        ],
    },
    {
        id: 'crescendo',
        number: 3,
        title: '高鳴り',
        titleEn: 'Crescendo',
        subtitle: 'Rising Tension',
        accent: '#FF6B6B',
        scenes: [
            {
                id: 'storm-approach',
                background: 'linear-gradient(180deg, #1a1a2e 0%, #2a1a3e 25%, #3a2a4e 45%, #2a1a3e 70%, #1a0a2e 100%)',
                characterVisible: true,
                characterPosition: 'center',
                particleType: 'petals',
                dialogue: [
                    {
                        speaker: null,
                        text: '空が暗くなり、不穏なリズムが大地を揺らし始めた。',
                        textEn: 'The sky darkened, and an ominous rhythm began to shake the earth.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: '来た……ディスコードの波が。',
                        textEn: 'It\'s coming... the wave of Discord.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: '怖がらないで。リズムに集中して。ビートを感じて。',
                        textEn: 'Don\'t be afraid. Focus on the rhythm. Feel the beat.',
                    },
                    {
                        speaker: null,
                        text: '嵐の中でも、彼女の声だけは澄んでいた。まるで、すべてのノイズを貫く旋律のように。',
                        textEn: 'Even in the storm, her voice alone remained clear. Like a melody piercing through all the noise.',
                    },
                    {
                        speaker: 'アズレア',
                        speakerEn: 'Azurea',
                        text: 'さあ、始めましょう。あなたのリズムで、この嵐を鎮めて。',
                        textEn: 'Now, let\'s begin. Calm this storm with your rhythm.',
                    },
                    {
                        speaker: null,
                        text: '――物語は、まだ始まったばかりだ。',
                        textEn: '— The story has only just begun.',
                    },
                ],
            },
        ],
    },
];

export const PARTICLE_EMOJIS: Record<string, string[]> = {
    butterflies: ['🦋', '🦋', '🦋', '🌿', '🍃', '🌸'],
    petals: ['🌸', '🌺', '🏵️', '💮', '🌷', '🌹'],
    fireflies: ['✨', '💫', '⭐', '✨', '🌟', '💫'],
    snow: ['❄️', '❅', '❆', '🌨️', '❄️', '❅'],
    stars: ['⭐', '🌟', '💫', '✨', '⭐', '🌟'],
};
