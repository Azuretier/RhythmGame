"use client"

import {motion, animate} from 'framer-motion'
import {useEffect} from 'react'

const Gatiiku = () => {
    
    useEffect(() => {
        const fadeUp = document.getElementById("fadeUp")
        if(fadeUp != null) animate(fadeUp, {opacity: [0.1, 1]})
    }, []); // 空の依存配列により、ページの最初のレンダリング時のみ実行

    return (
        <main className="flex justify-center items-center h-screen">
            <motion.div
                className="bg-white p-4 rounded-xl text-xl"
                initial={{scale: 0, opacity: 0}}
                animate={{scale: 1}}
                id="fadeUp"
            >
                1919
            </motion.div>
        </main>
        
    )
}

export default Gatiiku