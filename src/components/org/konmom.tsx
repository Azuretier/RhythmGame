import React from "react"

const Mommy = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="font-semibold text-2xl">{children}</div>
    )
}

export default Mommy