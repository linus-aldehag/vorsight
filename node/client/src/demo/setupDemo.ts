import { mockEngine } from './mockEngine';
import { setupMockRest } from './mockRest';
import { setupMockSocket } from './mockSocket';

export function setupDemoServer() {
    console.log(
        '%c 🎮 Vorsight Interactive Demo Server Active %c Running in-browser POC engine (zero backend dependencies)',
        'background: #0284c7; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
        'color: #0284c7; font-weight: bold;'
    );

    setupMockRest();
    setupMockSocket();
    mockEngine.startTimers();
}
