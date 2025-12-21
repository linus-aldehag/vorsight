// Test script to simulate Service sending audit event to Server
const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to server');

    // Simulate machine connection
    socket.emit('machine:connect', {
        machineId: 'f5afb8fa-cf44-dda5-f434-69ec66cb14f8', // Use your actual machine ID
        apiKey: 'test-key-123' // This might fail auth, but we can check if audit event is received
    });

    // Wait a bit, then send test audit event
    setTimeout(() => {
        console.log('📋 Sending test audit event...');

        socket.emit('machine:audit', {
            machineId: 'f5afb8fa-cf44-dda5-f434-69ec66cb14f8',
            auditEvent: {
                eventId: '4720',
                eventType: 'User Account Created',
                username: 'TestUser',
                timestamp: new Date().toISOString(),
                details: 'Test audit event from simulator',
                sourceLogName: 'Security',
                isFlagged: true
            }
        });

        console.log('✅ Test audit event sent');

        // Wait for server to process, then exit
        setTimeout(() => {
            console.log('Disconnecting...');
            socket.disconnect();
            process.exit(0);
        }, 2000);
    }, 1000);
});

socket.on('machine:connected', (response) => {
    console.log('✅ Machine authenticated:', response);
});

socket.on('machine:error', (error) => {
    console.log('❌ Server error:', error);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
