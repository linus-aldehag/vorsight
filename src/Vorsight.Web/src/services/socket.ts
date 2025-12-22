import { io, Socket } from 'socket.io-client';

type SocketEventHandler = (...args: any[]) => void;

class SocketService {
    private socket: Socket | null = null;
    private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();

    connect(url: string = window.location.origin): void {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('✓ Socket connected:', this.socket?.id);

            // Re-register all event handlers after reconnection
            this.eventHandlers.forEach((handlers, event) => {
                handlers.forEach(handler => {
                    this.socket?.on(event, handler);
                });
            });

            // Re-emit connect to allow client code to react
            const connectHandlers = this.eventHandlers.get('connect');
            if (connectHandlers) {
                connectHandlers.forEach(handler => handler());
            }
        });

        this.socket.on('disconnect', (reason: string) => {
            console.log('Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error: Error) => {
            console.error('Socket connection error:', error);
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, handler: SocketEventHandler): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);

        // If socket is already connected, register the handler immediately
        if (this.socket?.connected) {
            this.socket.on(event, handler);
        }
    }

    off(event: string, handler: SocketEventHandler): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }

        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    emit(event: string, data?: any): void {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`Cannot emit ${event}: socket not connected`);
        }
    }

    get isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

// Export singleton instance
export const socketService = new SocketService();
