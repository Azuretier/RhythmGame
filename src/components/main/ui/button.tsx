import React from 'react'
import { useState } from 'react'

const Button = () => {
    const [value, setState] = useState(0)

    const Plus = () =>{
        setState(value + 1)
    }

    return (
        <button className="p-6  bg-white rounded-none shadow-lg text-red-400" onClick={Plus}>{value}</button>
    )
}

export { Button };