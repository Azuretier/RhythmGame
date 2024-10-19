'use client'

import Center from "@/components/org/c"
import B from "@/components/org/button"
import {FadeUpDiv, FadeUpStagger} from "@/components/animation"

export default function gatiiku() {
    return (
        <main>
            <FadeUpStagger>
                <FadeUpDiv>
                    <Center>Hello how are yo' doing bro</Center>
                    <B/>
                </FadeUpDiv>
            </FadeUpStagger> 
        </main>
    )
}