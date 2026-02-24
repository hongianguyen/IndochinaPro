'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, ArrowRight } from 'lucide-react'
import { useChatStore, useItineraryStore } from '@/store'

export function ChatPanel() {
    const { messages, isRefining, addMessage, setRefining } = useChatStore()
    const { current, updateDays, setCurrent } = useItineraryStore()
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        const prompt = input.trim()
        if (!prompt || isRefining || !current) return

        setInput('')
        addMessage({ role: 'user', content: prompt })
        setRefining(true)

        try {
            const res = await fetch('/api/itinerary/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentItinerary: current,
                    userPrompt: prompt,
                    chatHistory: messages.slice(-8),
                }),
            })

            const data = await res.json()

            if (data.success && data.data) {
                // Update the itinerary in store
                setCurrent(data.data)

                // Add AI response with summary
                const changedInfo = data.changedDays?.length > 0
                    ? `\n\n✅ **Updated:** Day${data.changedDays.length > 1 ? 's' : ''} ${data.changedDays.join(', ')}`
                    : ''

                addMessage({
                    role: 'assistant',
                    content: (data.summary || 'Changes applied.') + changedInfo,
                })
            } else {
                addMessage({
                    role: 'assistant',
                    content: `Sorry, I couldn't apply that change: ${data.error || 'Unknown error'}. Please try rephrasing your request.`,
                })
            }
        } catch (err: any) {
            addMessage({
                role: 'assistant',
                content: 'Something went wrong connecting to the AI. Please try again.',
            })
        } finally {
            setRefining(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const suggestions = [
        "Replace the museum visit on Day 2 with a cooking class",
        "Upgrade all hotels to 5-star luxury",
        "Add a spa afternoon on Day 3",
        "Change Day 1 dinner to a street food tour",
    ]

    return (
        <div className="flex flex-col h-full bg-navy-900/50 border-l border-navy-700/50">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-700/50 bg-navy-900/80">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                    <Sparkles size={14} className="text-navy-950" />
                </div>
                <div>
                    <h3 className="text-cream-100 text-sm font-semibold">AI Travel Assistant</h3>
                    <p className="text-navy-400 text-xs">Refine your itinerary with natural language</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-gold-500/20 text-gold-400'
                                }`}>
                                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                            </div>

                            {/* Message bubble */}
                            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-500/15 text-blue-100 border border-blue-500/20'
                                    : 'bg-navy-800/60 text-navy-200 border border-navy-700/50'
                                }`}>
                                {msg.content.split('\n').map((line, i) => (
                                    <span key={i}>
                                        {line.includes('**') ? (
                                            <span dangerouslySetInnerHTML={{
                                                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gold-400">$1</strong>')
                                            }} />
                                        ) : line}
                                        {i < msg.content.split('\n').length - 1 && <br />}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {isRefining && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                    >
                        <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                            <Bot size={13} />
                        </div>
                        <div className="bg-navy-800/60 border border-navy-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
                            <Loader2 size={14} className="text-gold-400 animate-spin" />
                            <span className="text-sm text-navy-400">Refining itinerary...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (show only when few messages) */}
            {messages.length <= 2 && !isRefining && (
                <div className="px-4 pb-3">
                    <p className="text-[10px] text-navy-500 uppercase tracking-wider mb-2">Try asking:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(s)}
                                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-navy-800/50 border border-navy-700/40
                           text-navy-300 hover:text-gold-400 hover:border-gold-500/30 transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-navy-700/50 p-4 bg-navy-900/80">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask to modify the itinerary..."
                        disabled={isRefining}
                        rows={1}
                        className="flex-1 bg-navy-800/50 border border-navy-700/50 rounded-xl px-4 py-3 text-sm
                       text-cream-100 placeholder:text-navy-500 resize-none
                       focus:outline-none focus:border-gold-500/40 transition-colors
                       disabled:opacity-50"
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isRefining}
                        className="w-11 h-11 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950
                       flex items-center justify-center transition-colors
                       disabled:opacity-30 disabled:hover:bg-gold-500 flex-shrink-0"
                    >
                        {isRefining ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </div>
            </div>

            {/* Next Step Button */}
            <div className="border-t border-navy-700/50 p-4 bg-navy-950/50">
                <button
                    onClick={() => console.log('Next step: Pricing (coming soon)')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500
                     text-white font-semibold text-sm flex items-center justify-center gap-2
                     hover:from-emerald-500 hover:to-emerald-400 transition-all"
                >
                    <CheckCircle size={16} />
                    I'm Satisfied — Next Step
                    <ArrowRight size={14} />
                </button>
            </div>
        </div>
    )
}
