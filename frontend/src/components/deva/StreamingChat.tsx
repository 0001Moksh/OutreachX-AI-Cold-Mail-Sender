"use client";

import React, { useState, useRef } from 'react';

export default function StreamingChat() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!prompt) return;
        
        setMessages(prev => [...prev, { role: 'user', content: prompt }]);
        setIsLoading(true);
        setPrompt('');

        // TODO: Connect to backend orchestrator SSE endpoint
        // e.g. const response = await fetch('/api/orchestrator', { ... })
        // const reader = response.body.getReader()
        
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'agent', content: 'Simulation: Streamed response from Deva...' }]);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full border rounded shadow-sm p-4">
            <h2 className="text-xl font-semibold mb-4">Deva Agent Chat</h2>
            <div className="flex-grow overflow-y-auto border rounded p-4 mb-4 bg-gray-50">
                {messages.map((msg, i) => (
                    <div key={i} className={`mb-2 p-2 rounded ${msg.role === 'user' ? 'bg-blue-100 self-end text-right' : 'bg-white border'}`}>
                        <span className="font-semibold">{msg.role === 'user' ? 'You' : 'Deva'}: </span>
                        {msg.content}
                    </div>
                ))}
                {isLoading && <div className="text-gray-400 italic">Deva is thinking...</div>}
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask Deva to research leads or create campaigns..."
                    className="flex-grow border p-2 rounded"
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:bg-gray-400"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
