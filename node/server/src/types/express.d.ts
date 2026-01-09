import { Machine } from '@prisma/client';
import { JwtUserPayload } from './index';
import { Server as SocketIOServer } from 'socket.io';

declare global {
    namespace Express {
        interface Request {
            machine?: Machine;
            user?: JwtUserPayload;
            // We'll augment the app to include io, but simpler to type it on request if middleware adds it
            // or using req.app.get('io')
        }

        interface Application {
            io?: SocketIOServer;
        }
    }
}
