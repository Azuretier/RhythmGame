"use client"

import {motion} from 'framer-motion'
import {useEffect, useState} from 'react'

const Gatiiku = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      // ページを読み込むたびに count を 1 増やす
      setCount((prevCount) => prevCount + 1);
    }, []); // 空の依存配列により、ページの最初のレンダリング時のみ実行

    return (
        <main className="flex justify-center items-center h-screen" key={count}>
            <motion.div
                key={count}
                className="bg-white p-4 rounded-xl text-xl"
                initial={{scale: 0, opacity: 0.01}}
                animate={{scale: 1, opacity: 1}}
            >
                1919
            </motion.div>
        </main>
        
    )
}

export default Gatiiku