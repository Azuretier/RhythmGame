"use client"

//import Center from "@/components/org/c"
//import {FadeUpDiv, FadeUpStagger} from "@/components/animation"
import {useEffect} from 'react'
import {motion} from 'framer-motion'
import {animate} from 'framer-motion/dom'
import {
    FaBirthdayCake
} from 'react-icons/fa'

const Main = () => {
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
                className="grid p-4 rounded-xl text-xl text-white row-start-3 col-span-3 self-start border border-zinc-200 dark:border-zinc-800"
                initial={{y: 20, opacity: 0}}
                animate={{y: 0}}
                transition={{type: 'spring'}}
                id="fadeUp"
            >
                <section className="text-3xl font-black justify-self-center">あずれーと</section>
                <div className="grid grid-flow-col items-center justify-start gap-2">
                    <FaBirthdayCake/>
                    <p>200X/2/18</p>
                </div>
            </motion.div>
            <section className="row-span-2"></section>  
        </main>
    )
}

export default Main