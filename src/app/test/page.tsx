"use client"

import {useEffect} from 'react'
import {motion} from 'framer-motion'
import {animate} from 'framer-motion/dom'
import {
    FaBirthdayCake,
    FaUserGraduate,
    FaPaperPlane,
} from 'react-icons/fa'
import Image from 'next/image'

const Main = () => {
    useEffect(() => {
        const fadeUp = document.getElementById("fadeUp");
        if (fadeUp != null) {
            animate(fadeUp, {opacity: [0.1, 1]});
        }
    }, []);
    return (
        <main className="grid grid-cols-12 grid-rows-6 grid-flow-row items-center justify-center h-screen bg-black">   
            <motion.div 
                className="grid gap-4 p-4 rounded-xl text-base font-black text-white row-start-3 col-start-2 row-span-2 col-span-5"
                initial={{y: 20, opacity: 0}}
                animate={{y: 0}}
                transition={{type: 'spring'}}
                id="fadeUp"
            >
                <Image src="/azure.png" alt="avatar" width={200} height={200}/>
                <div className="grid row-start-2 col-span-3">
                    <p className="text-3xl">Azuret</p>
                    <p className="text-subtext">あずれーと</p>
                    <p className="font-normal text-subtext text-lg">I make my world myself</p>
                </div>
                <div className="grid gap-1 text-subtext">
                    <div className="flex gap-2 items-center">
                        <FaBirthdayCake/>
                        <p>200X/2/18</p>  
                    </div>
                    <div className="flex gap-2 items-center">
                        <FaUserGraduate/>
                        <p>Student</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <FaPaperPlane/>
                        <p>{"Life is like a paper airplane, isn't it?"}</p>
                    </div>
                </div>
            </motion.div>
        </main>
    )
}

export default Main