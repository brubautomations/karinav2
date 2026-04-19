import { Link } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'

export default function Landing() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="glass-panel rounded-3xl p-12 max-w-lg text-center">
                <h1 className="text-6xl font-display font-bold mb-4 text-gradient-primary">
                    Karina
                </h1>
                <p className="text-white/70 mb-8 text-lg">
                    Your Filipino AI companion. In Taglish, with personality.
                </p>

                <SignedOut>
                    <div className="flex gap-3 justify-center">
                        <Link
                            to="/signup"
                            className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition"
                        >
                            Sign Up
                        </Link>
                        <Link
                            to="/login"
                            className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 transition"
                        >
                            Log In
                        </Link>
                    </div>
                </SignedOut>

                <SignedIn>
                    <Link
                        to="/chat"
                        className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold hover:opacity-90 transition"
                    >
                        Open Chat
                    </Link>
                </SignedIn>
            </div>
        </div>
    )
}