'use client'

import Image from "next/image";
import { motion } from "framer-motion";
import {
    FaBirthdayCake,
    FaDiscord,
    FaGithub,
    FaLocationArrow,
    FaSteam,
    FaTwitter,
    FaUserGraduate,
    FaXbox,
    FaYoutube,
  } from "react-icons/fa";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-slate-900">
        <motion.div
            initial={{ opacity: 0, y: 50 }} // 初期状態
            animate={{ opacity: 1, y: 0 }} // アニメーション後の状態
            transition={{
                opacity: { duration: 1.6 },      // opacityは2秒でモーション
                y: { duration: 0.8 }             // y軸は1秒でモーション
            }} // アニメーションの持続時間
            className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4"
        >
                <div className="shrink-0">
                    <Image className="size-24" src="/azure.webp" width={800} height={800} quality={75} alt="Azure Logo"/>
                </div>
                <div>
                    <div className="text-xl font-medium text-black">Azure</div>
                    <p className="text-slate-500">You have a new message!</p>
                    <FaBirthdayCake /><p className="text-slate-500">Birthday</p>
                </div>
        </motion.div>
    </div>
  );
}
