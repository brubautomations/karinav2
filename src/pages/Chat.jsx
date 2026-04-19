import { useUser, UserButton } from '@clerk/clerk-react'

export default function Chat() {
    const { user } = useUser()

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-display font-bold">
                        Hey {user?.firstName || user?.username || 'there'} 👋
                    </h1>
                    <UserButton afterSignOutUrl="/" />
                </div>

                <div className="glass-panel rounded-3xl p-8">
                    <p className="text-white/60 text-center">
                        Chat interface coming in Step 2.5. For now, this is just a placeholder
                        to verify auth works.
                    </p>
                    <p className="text-white/40 text-sm text-center mt-4">
                        Your Clerk user ID: <code className="bg-white/10 px-2 py-1 rounded">{user?.id}</code>
                    </p>
                </div>
            </div>
        </div>
    )
}