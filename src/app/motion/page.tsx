'use client'

import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <motion.div
            initial={{ opacity: 0 }} // 初期状態
            animate={{ opacity: 1 }} // アニメーション後の状態
            transition={{ duration: 1 }} // アニメーションの持続時間
        >
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start bg-[var(--custom)])">
                <a className="text-xl">
                    Motion
                </a>
            </main>
        </motion.div>
    </div>
  );
}
