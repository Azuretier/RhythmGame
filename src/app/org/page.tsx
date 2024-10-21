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
                className="grid gap-6 p-4 rounded-xl text-xl text-white row-start-2 col-span-3 self-start dark:border-zinc-800"
                initial={{y: 20, opacity: 0}}
                animate={{y: 0}}
                transition={{type: 'spring'}}
                id="fadeUp"
            >
                <section className="grid text-base justify-center font-black">
                    <Image className="justify-center" src="/azure.png" alt="avatar" width={200} height={200}/>
                    <p className="grid justify-center text-3xl">Azuret</p>
                    <p className="justify-center text-subtext">あずれーと</p>
                    <p className="font-normal text-subtext text-lg">世界は自分で創る</p>
                </section>
                <div className="grid grid-flow-row gap-1 text-subtext">
                    <div className="grid grid-flow-col gap-2 justify-start">
                        <FaBirthdayCake/>
                        <p>200X/2/18</p>    
                    </div>
                    <div className="grid grid-flow-col gap-2  justify-start">
                        <FaAngleDoubleUp/>
                        <p>Study to get experience.</p>
                    </div>
                </div>
            </motion.div>
            <section className="row-span-2"></section>  
        </main>
    )
}

export default Main