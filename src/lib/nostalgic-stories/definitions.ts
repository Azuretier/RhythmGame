/**
 * Chapter Player — Data Structure
 *
 * Each chapter is stored in a JSON-friendly format.
 * To add new chapters, duplicate a ChapterData entry and modify the nodes.
 */

/** Transition type when a scene enters */
export type SceneTransition = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom-in';

/** A single dialog node within a chapter */
export interface ChapterNode {
    /** Splash art: CSS gradient string or image URL (supports both) */
    image_url: string;
    /** Optional speaker name (i18n key under the chapter's namespace) */
    character_name: string | null;
    /** Dialog text (i18n key under the chapter's namespace) */
    text: string;
    /** Audio trigger ID — reserved for future SFX/voice lines */
    audio: string | null;
    /** Transition type for the splash art entering */
    transition: SceneTransition;
    /** Particle overlay for this scene */
    particles: 'stars' | 'snow' | 'embers' | 'petals' | 'rain' | 'none';
    /** Ken Burns zoom direction: 'in' zooms from 1.0→1.08, 'out' from 1.08→1.0, 'none' disables */
    ken_burns: 'in' | 'out' | 'none';
}

/** A complete chapter */
export interface ChapterData {
    id: string;
    /** i18n key for the chapter title */
    title_key: string;
    /** i18n key for the chapter subtitle/description */
    subtitle_key: string;
    /** Badge label shown on chapter card */
    badge: string;
    /** Accent color for the chapter card */
    accent: string;
    /** All dialog nodes in order */
    nodes: ChapterNode[];
}

export const CHAPTERS: ChapterData[] = [
    {
        id: 'origin',
        title_key: 'origin.title',
        subtitle_key: 'origin.subtitle',
        badge: 'CH.01',
        accent: '#7c3aed',
        nodes: [
            {
                image_url: 'linear-gradient(180deg, #0a0015 0%, #1a0033 40%, #2d1b69 70%, #0a0015 100%)',
                character_name: 'origin.characters.narrator',
                text: 'origin.scenes.s1',
                audio: null,
                transition: 'fade',
                particles: 'stars',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #0d001a 0%, #1a0044 30%, #3b0764 60%, #7c3aed 100%)',
                character_name: 'origin.characters.melodia',
                text: 'origin.scenes.s2',
                audio: null,
                transition: 'fade',
                particles: 'stars',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #0f0520 0%, #1e0a3e 30%, #4a1d96 55%, #6d28d9 80%, #1e0a3e 100%)',
                character_name: 'origin.characters.narrator',
                text: 'origin.scenes.s3',
                audio: null,
                transition: 'slide-left',
                particles: 'embers',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #000011 0%, #0c0033 30%, #1e0066 50%, #5b21b6 75%, #7c3aed 100%)',
                character_name: 'origin.characters.melodia',
                text: 'origin.scenes.s4',
                audio: null,
                transition: 'fade',
                particles: 'stars',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #0a0020 0%, #1a0050 25%, #3b0d99 50%, #7c3aed 75%, #ddd6fe 100%)',
                character_name: 'origin.characters.narrator',
                text: 'origin.scenes.s5',
                audio: null,
                transition: 'zoom-in',
                particles: 'embers',
                ken_burns: 'in',
            },
        ],
    },
    {
        id: 'silence',
        title_key: 'silence.title',
        subtitle_key: 'silence.subtitle',
        badge: 'CH.02',
        accent: '#0ea5e9',
        nodes: [
            {
                image_url: 'linear-gradient(180deg, #000000 0%, #001122 30%, #002244 60%, #001122 100%)',
                character_name: 'silence.characters.wanderer',
                text: 'silence.scenes.s1',
                audio: null,
                transition: 'fade',
                particles: 'snow',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #000508 0%, #001520 30%, #002a40 50%, #003d5c 70%, #001520 100%)',
                character_name: 'silence.characters.narrator',
                text: 'silence.scenes.s2',
                audio: null,
                transition: 'slide-right',
                particles: 'snow',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #000205 0%, #000d1a 25%, #0c4a6e 50%, #0284c7 75%, #000d1a 100%)',
                character_name: 'silence.characters.wanderer',
                text: 'silence.scenes.s3',
                audio: null,
                transition: 'fade',
                particles: 'snow',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #000a14 0%, #001d33 25%, #0369a1 50%, #0ea5e9 70%, #bae6fd 100%)',
                character_name: 'silence.characters.echo',
                text: 'silence.scenes.s4',
                audio: null,
                transition: 'slide-up',
                particles: 'none',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #000000 0%, #000814 30%, #001e3d 50%, #0c4a6e 70%, #0ea5e9 100%)',
                character_name: 'silence.characters.narrator',
                text: 'silence.scenes.s5',
                audio: null,
                transition: 'fade',
                particles: 'snow',
                ken_burns: 'in',
            },
        ],
    },
    {
        id: 'ember',
        title_key: 'ember.title',
        subtitle_key: 'ember.subtitle',
        badge: 'CH.03',
        accent: '#f97316',
        nodes: [
            {
                image_url: 'linear-gradient(180deg, #1a0a00 0%, #3d1500 30%, #7c2d12 55%, #ea580c 80%, #1a0a00 100%)',
                character_name: 'ember.characters.keeper',
                text: 'ember.scenes.s1',
                audio: null,
                transition: 'fade',
                particles: 'embers',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #0a0500 0%, #2d1200 25%, #9a3412 50%, #f97316 70%, #fbbf24 100%)',
                character_name: 'ember.characters.narrator',
                text: 'ember.scenes.s2',
                audio: null,
                transition: 'slide-left',
                particles: 'embers',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #1c0800 0%, #451a03 30%, #c2410c 55%, #f97316 75%, #fed7aa 100%)',
                character_name: 'ember.characters.keeper',
                text: 'ember.scenes.s3',
                audio: null,
                transition: 'fade',
                particles: 'embers',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #000000 0%, #1c0800 20%, #7c2d12 40%, #ea580c 60%, #fbbf24 80%, #fef3c7 100%)',
                character_name: 'ember.characters.flame',
                text: 'ember.scenes.s4',
                audio: null,
                transition: 'zoom-in',
                particles: 'embers',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #0a0500 0%, #3d1500 20%, #ea580c 50%, #f97316 70%, #0a0500 100%)',
                character_name: 'ember.characters.narrator',
                text: 'ember.scenes.s5',
                audio: null,
                transition: 'fade',
                particles: 'embers',
                ken_burns: 'in',
            },
        ],
    },
    {
        id: 'bloom',
        title_key: 'bloom.title',
        subtitle_key: 'bloom.subtitle',
        badge: 'CH.04',
        accent: '#ec4899',
        nodes: [
            {
                image_url: 'linear-gradient(180deg, #0a000a 0%, #1a001a 25%, #4a0e4e 50%, #831843 70%, #0a000a 100%)',
                character_name: 'bloom.characters.narrator',
                text: 'bloom.scenes.s1',
                audio: null,
                transition: 'fade',
                particles: 'petals',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #0d000d 0%, #2e0028 20%, #831843 45%, #ec4899 65%, #fce7f3 100%)',
                character_name: 'bloom.characters.sakura',
                text: 'bloom.scenes.s2',
                audio: null,
                transition: 'slide-right',
                particles: 'petals',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #0f000f 0%, #3b0030 20%, #9d174d 40%, #ec4899 60%, #fbcfe8 80%, #fdf2f8 100%)',
                character_name: 'bloom.characters.narrator',
                text: 'bloom.scenes.s3',
                audio: null,
                transition: 'fade',
                particles: 'petals',
                ken_burns: 'in',
            },
            {
                image_url: 'linear-gradient(180deg, #1a0010 0%, #500030 25%, #be185d 50%, #ec4899 70%, #fce7f3 90%, #fff1f2 100%)',
                character_name: 'bloom.characters.sakura',
                text: 'bloom.scenes.s4',
                audio: null,
                transition: 'slide-up',
                particles: 'petals',
                ken_burns: 'out',
            },
            {
                image_url: 'linear-gradient(180deg, #000000 0%, #1a0010 15%, #831843 35%, #ec4899 55%, #fce7f3 75%, #0a000a 100%)',
                character_name: 'bloom.characters.narrator',
                text: 'bloom.scenes.s5',
                audio: null,
                transition: 'fade',
                particles: 'petals',
                ken_burns: 'in',
            },
        ],
    },
];
