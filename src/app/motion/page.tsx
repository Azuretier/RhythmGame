'use client';

import { motion } from 'framer-motion';

const Page: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }} // 初期状態
      animate={{ opacity: 1 }} // アニメーション後の状態
      transition={{ duration: 1 }} // アニメーションの持続時間
    >
      <div className="p-8">
        <h1>こんにちは！</h1>
        <p>これはフェードインアニメーションを持つページです。</p>
      </div>
    </motion.div>
  );
};

export default Page;