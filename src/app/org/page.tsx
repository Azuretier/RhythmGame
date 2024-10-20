"use client"

//import Center from "@/components/org/c"
//import {FadeUpDiv, FadeUpStagger} from "@/components/animation"
import {useEffect} from 'react'
import {motion} from 'framer-motion'
import {animate} from 'framer-motion/dom'

const Gatiiku = () => {
    useEffect(() => {
        const fadeUp = document.getElementById("fadeUp")
        if (fadeUp != null) {
            animate(fadeUp, {opacity: [0.1, 1]})
        }
    }, []); // 空の依存配列で初回レンダリング時にのみ実行

    return (
        <main className="flex items-center justify-center h-screen">    
            <motion.div 
                className="bg-white p-4 rounded-xl text-xl text-black"
                initial={{y: 100, scale:0, opacity: 0}}
                animate={{y: 0, scale: 1}}
                transition={{type: 'spring'}}
                id="fadeUp"
            >gatiiku</motion.div>
        </main>
    )
}

export default Gatiiku