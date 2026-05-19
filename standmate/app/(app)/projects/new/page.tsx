'use client'
import { SiteHeader } from "@/components/site-header"
import { BrainstormInterface } from "@/components/brainstorm-interface"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { useState } from "react"

export default function Page() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    return (
        <>
            <SiteHeader>
                <div className="flex items-center gap-2 ml-auto">
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </div>
            </SiteHeader>
            <BrainstormInterface />
            <CreateProjectModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </>
    )
}
