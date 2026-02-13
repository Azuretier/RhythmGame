import type { StoryData } from '@/types/dialog';

/**
 * Sample story data demonstrating the dialog system with animation triggers.
 * Each line includes an `animation` and `expression` field to sync
 * the 3D character with the dialog text.
 */
export const sampleStory: StoryData = {
  title: 'Rhythmia - 序章',
  scenes: [
    {
      id: 'intro-01',
      background: 'linear-gradient(135deg, #0a0c2e 0%, #1a1040 50%, #0a0c2e 100%)',
      characterName: 'リナ',
      lines: [
        {
          text: 'あ、やっと来たんだ！待ってたよ〜',
          animation: 'wave',
          expression: 'smile',
          typingSpeed: 35,
        },
        {
          text: 'ここはリズミアの世界。音楽とリズムが全てを動かしているの。',
          animation: 'talking',
          expression: 'neutral',
          typingSpeed: 30,
        },
        {
          text: 'でも最近、ノイズリングっていう厄介なやつが現れてね…',
          animation: 'thinking',
          expression: 'thinking',
          typingSpeed: 30,
        },
        {
          text: 'リズムが乱されて、世界がどんどん壊れていってるの！',
          animation: 'surprised',
          expression: 'surprised',
          typingSpeed: 25,
        },
        {
          text: 'でも大丈夫、あなたが来てくれたから。一緒にリズムを取り戻そう！',
          animation: 'happy',
          expression: 'smile',
          typingSpeed: 30,
        },
        {
          text: 'ブロックをリズムに合わせて置くのがコツだよ。PERFECT判定を狙ってね！',
          animation: 'talking',
          expression: 'neutral',
          typingSpeed: 28,
        },
      ],
    },
    {
      id: 'intro-02',
      background: 'linear-gradient(135deg, #1a0a2e 0%, #2a1050 50%, #1a0a2e 100%)',
      characterName: 'リナ',
      lines: [
        {
          text: 'さっそく始めようか。まずは基本の操作から！',
          animation: 'talking',
          expression: 'smile',
          typingSpeed: 30,
        },
        {
          text: '矢印キーで移動、スペースでハードドロップ。Z/Xで回転だよ。',
          animation: 'talking',
          expression: 'neutral',
          typingSpeed: 28,
        },
        {
          text: 'うまくいったら…ちょっと嬉しいかも。',
          animation: 'idle',
          expression: 'smile',
          typingSpeed: 35,
        },
      ],
    },
  ],
};
