"use client"

import Center from "@/components/org/c"
//import {FadeUpDiv, FadeUpStagger} from "@/components/animation"
import {motion} from "framer-motion"

import React, { useState, useEffect } from 'react';

const Gatiiku = () => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false); // 初期状態は false

    useEffect(() => {
        // ページが読み込まれた時に isLoaded を true に設定
        setIsLoaded(true);
    }, []); // 空の依存配列で初回レンダリング時にのみ実行

    return (
        <main className="flex items-center justify-center h-screen">    
            {isLoaded ? <motion.div
                initial={{opacity: 0, y:10}}
                animate={ 
                    {
                        opacity: 1,
                        y:0,
                        transition: { 
                            type: 'spring',
                            delay: 0.15
                        }
                    }
                }
            >
                <Center>Hello how are yo&apos; doing bro</Center>
            </motion.div>
            : null}
        </main>
    )
}

export default Gatiiku