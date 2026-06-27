"use client";

import React from 'react';

export default function CostDashboard() {
    return (
        <div className="p-4 border rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-4">API Cost Tracking</h2>
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded border">
                    <p className="text-sm text-gray-500">Total Spend</p>
                    <p className="text-2xl font-bold">$0.00</p>
                </div>
                <div className="p-4 bg-gray-50 rounded border">
                    <p className="text-sm text-gray-500">Tokens Used</p>
                    <p className="text-2xl font-bold">0</p>
                </div>
                <div className="p-4 bg-gray-50 rounded border">
                    <p className="text-sm text-gray-500">Active Models</p>
                    <p className="text-2xl font-bold">Gemini 3.1</p>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
                Usage is tracked per request based on the BYOK provided.
            </p>
        </div>
    );
}
