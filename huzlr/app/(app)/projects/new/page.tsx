'use client'
import { SiteHeader } from "@/components/site-header"
import { BrainstormInterface } from "@/components/brainstorm-interface"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { useState } from "react"

export default function Page() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <SiteHeader />
            <div className="flex flex-row flex-1 overflow-hidden w-full">
                <div className="flex-1 min-w-0 h-full">
                    <BrainstormInterface onNewProjectClick={() => setIsCreateModalOpen(true)} />
                </div>
                <CreateProjectModal
                    open={isCreateModalOpen}
                    onOpenChange={setIsCreateModalOpen}
                    inline={true}
                />
            </div>
        </div>
    )
}
