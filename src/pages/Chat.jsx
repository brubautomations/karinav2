import { UserButton } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import ChatInterface from '../components/ChatInterface'

export default function Chat() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Top bar */}
            <nav className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                <Link
                    to="/"
                    className="font-display font-bold text-xl tracking-wider text-gradient-primary"
                >
                    KARINA
                </Link>
                <UserButton afterSignOutUrl="/" />
            </nav>

            {/* Chat area */}
            <main className="flex-1 flex items-center justify-center p-4">
                <ChatInterface />
            </main>
        </div>
    )
}