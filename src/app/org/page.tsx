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
        <main className="grid grid-cols-12 grid-rows-3 grid-flow-row gap-4 items-center justify-center h-screen">
            <section className="row-span-2"></section>    
            <motion.div 
                className="p-4 rounded-xl text-xl text-white row-start-3 col-span-3 self-start border-2 border-rose-500"
                initial={{y: 20, opacity: 0}}
                animate={{y: 0}}
                transition={{type: 'spring'}}
                id="fadeUp"
            >
                gatiiku
            </motion.div>
            <section className="row-span-2"></section>  
        </main>
    )
}

export default Gatiiku