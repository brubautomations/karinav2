import { useState, useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'

export default function ChatInterface() {
    const { getToken } = useAuth()
    const { user } = useUser()

    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'karina',
            text: `Hey ${user?.firstName || user?.username || 'you'} 👋 kamusta?`,
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    const handleSend = async (e) => {
        e.preventDefault()
        const text = input.trim()
        if (!text || isLoading) return

        setError(null)
        const userMsg = { id: Date.now(), sender: 'user', text }
        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const token = await getToken()
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: text }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong')
            }

            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, sender: 'karina', text: data.reply },
            ])
        } catch (err) {
            setError(err.message)
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    sender: 'karina',
                    text: "Sorry bes, may glitch. Try ulit?",
                    isError: true,
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-3xl h-[80vh] glass-panel rounded-3xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 to-purple-500">
                    <div className="w-full h-full rounded-full bg-[#0a0a0f] flex items-center justify-center font-display font-bold">
                        K
                    </div>
                </div>
                <div>
                    <h3 className="font-display font-bold text-lg leading-tight">Karina</h3>
                    <div className="flex items-center gap-2 text-xs text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Online
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                ))}
                {isLoading && <TypingBubble />}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSend}
                className="p-4 border-t border-white/10 bg-black/20 relative"
            >
                <input
                    type="text"
                    className="w-full pl-5 pr-14 py-3 rounded-full glass-input placeholder-white/40"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Send"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </form>
            {error && (
                <div className="px-5 py-2 text-xs text-red-300 bg-red-500/10 border-t border-red-500/20">
                    {error}
                </div>
            )}
        </div>
    )
}

function MessageBubble({ msg }) {
    const isUser = msg.sender === 'user'
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                    K
                </div>
            )}
            <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl leading-relaxed text-sm ${isUser
                        ? 'bg-indigo-600/90 text-white rounded-br-sm'
                        : msg.isError
                            ? 'bg-red-500/20 text-red-100 border border-red-500/30 rounded-bl-sm'
                            : 'bg-white/10 text-gray-100 border border-white/5 rounded-bl-sm'
                    }`}
            >
                {msg.text}
            </div>
        </div>
    )
}

function TypingBubble() {
    return (
        <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                K
            </div>
            <div className="bg-white/10 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                />
                <span
                    className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                />
            </div>
        </div>
    )
}