import React from "react"

//componentとfuncの違い: componentはuiを, funcは動作を提供
const Center = ({children}: {children: React.ReactNode}) => {

    // items-center = vertical
    // justify-center = horizontal
    return (
        <main className="flex items-center justify-center h-screen">
            <div className="bg-white font-semibold text-2xl text-orange-300">{children}</div>
        </main>
    )
}

export default Center