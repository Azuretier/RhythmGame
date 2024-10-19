"use client"

//import Center from "@/components/org/c"
//import {FadeUpDiv, FadeUpStagger} from "@/components/animation"
import {useEffect} from 'react'
import {animate} from 'framer-motion/dom'

const Gatiiku = () => {

    useEffect(() => {
        // ページが読み込まれた時に isLoaded を true に設定
        animate("div", { x: [0, 100] }, { type: "spring" })
    }, []); // 空の依存配列で初回レンダリング時にのみ実行

    return (
        <main className="flex items-center justify-center h-screen">    
            <div>gatiiku</div>
        </main>
    )
}

export default Gatiiku