"use client"

import {motion} from 'framer-motion'

const Gatiiku = () => {
    return (
        <motion.div
            className="box"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            1919
        </motion.div>
    )
}

export default Gatiiku