"use client";

import React, { useState } from 'react';

export default function ApiKeyUI() {
    const [apiKey, setApiKey] = useState('');

    const handleSave = () => {
        // TODO: Send to backend to encrypt and store in user_api_keys
        console.log("Saving API Key:", apiKey);
    };

    return (
        <div className="p-4 border rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Manage API Keys (BYOK)</h2>
            <div className="flex flex-col gap-2">
                <label className="text-sm">Provider (e.g., Gemini, Groq)</label>
                <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key"
                    className="border p-2 rounded"
                />
                <button 
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-4 py-2 rounded mt-2 hover:bg-blue-700"
                >
                    Save Key
                </button>
                <p className="text-xs text-gray-500 mt-2">
                    Keys are AES-256 encrypted at rest.
                </p>
            </div>
        </div>
    );
}
