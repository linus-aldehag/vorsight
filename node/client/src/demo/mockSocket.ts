import { socketService } from '@/services/socket';
import { mockEngine } from './mockEngine';

export function setupMockSocket() {
    let connected = false;
    const eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

    // Helper to dispatch event to registered handlers
    const dispatchEvent = (event: string, ...args: any[]) => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(fn => fn(...args));
        }
    };

    // Override socketService methods
    socketService.connect = function (_url?: string) {
        if (connected) return;
        connected = true;

        // Listen to engine background events and forward to handlers
        mockEngine.addEventListener((event, data) => {
            dispatchEvent(event, data);
        });

        // Trigger connect event asynchronously
        setTimeout(() => {
            dispatchEvent('connect');
            // Initial machine list dispatch
            dispatchEvent('machines:list', mockEngine.getMachines(true));
        }, 50);
    };

    socketService.disconnect = function () {
        connected = false;
        dispatchEvent('disconnect', 'demo_disconnect');
    };

    socketService.on = function (event: string, handler: (...args: any[]) => void) {
        if (!eventHandlers.has(event)) {
            eventHandlers.set(event, new Set());
        }
        eventHandlers.get(event)!.add(handler);

        // If socket already connected and listening to connect, trigger immediately
        if (connected && event === 'connect') {
            handler();
        }
    };

    socketService.off = function (event: string, handler: (...args: any[]) => void) {
        const handlers = eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    };

    socketService.emit = function (event: string, data?: any) {
        if (event === 'web:subscribe') {
            setTimeout(() => {
                dispatchEvent('machines:list', mockEngine.getMachines(true));
            }, 10);
        } else if (event === 'web:watch') {
            // Watch machine requested
            console.log(`[DemoSocket] Watching machine: ${data}`);
        } else if (event === 'web:unwatch') {
            console.log(`[DemoSocket] Unwatching machine: ${data}`);
        }
    };

    Object.defineProperty(socketService, 'isConnected', {
        get() {
            return connected;
        },
        configurable: true
    });
}
