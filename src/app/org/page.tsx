"use client"

//import Center from "@/components/org/c"
//import {FadeUpDiv, FadeUpStagger} from "@/components/animation"
import {useEffect} from 'react'
import {motion} from 'framer-motion'
import {animate} from 'framer-motion/dom'
import {
    FaBirthdayCake,
    FaAngleDoubleUp
} from 'react-icons/fa'
import Image from 'next/image'

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
                className="grid p-4 rounded-xl text-xl text-white row-start-2 col-span-3 self-start dark:border-zinc-800"
                initial={{y: 20, opacity: 0}}
                animate={{y: 0}}
                transition={{type: 'spring'}}
                id="fadeUp"
            >
                <section className="text-3xl font-black">
                    <Image src="/azure.png" alt="avatar" width={200} height={200}/>
                    <p className="justify-self-center">Azuret</p>
                </section>
                <div className="grid grid-flow-row gap-2 text-subtext">
                    <div className="grid grid-flow-col justify-start">
                        <FaBirthdayCake/>
                        <p>200X/2/18</p>    
                    </div>
                    <div className="grid grid-flow-col justify-start">
                        <FaAngleDoubleUp/>
                        <p>Level up enguage</p>
                    </div>
                </div>
            </motion.div>
            <section className="row-span-2"></section>  
        </main>
    )
}

export default Main