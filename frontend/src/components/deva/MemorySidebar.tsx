"use client";

import React from 'react';

export default function MemorySidebar() {
    return (
        <div className="w-64 border-r bg-gray-50 p-4 h-full">
            <h2 className="text-lg font-semibold mb-4">Agent Memory</h2>
            
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Short-Term Context</h3>
                <ul className="text-sm space-y-2">
                    <li className="bg-white p-2 rounded shadow-sm border">Active Thread: Campaign Planning</li>
                    <li className="bg-white p-2 rounded shadow-sm border">Current Goal: AI Startups in Gurugram</li>
                </ul>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Long-Term Memory</h3>
                <ul className="text-sm space-y-2">
                    <li className="bg-white p-2 rounded shadow-sm border text-gray-500 italic">User is a Software Engineer</li>
                    <li className="bg-white p-2 rounded shadow-sm border text-gray-500 italic">Prefers concise email templates</li>
                </ul>
            </div>
        </div>
    );
}
