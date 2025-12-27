const express = require('express');
const router = express.Router();
const ping = require('ping');
const db = require('../db/database');
const { authenticateBrowser } = require('../middleware/auth');

// Ping a specific machine by ID
router.post('/:machineId', authenticateBrowser, async (req, res) => {
    try {
        const { machineId } = req.params;

        // Get machine IP address
        const machine = db.prepare('SELECT id, name, ip_address, hostname FROM machines WHERE id = ?').get(machineId);

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // Try IP first, fallback to hostname
        const target = machine.ip_address || machine.hostname;

        if (!target) {
            return res.status(400).json({
                error: 'No IP address or hostname available for this machine',
                alive: false
            });
        }

        // Perform ping (timeout: 5 seconds)
        const result = await ping.promise.probe(target, {
            timeout: 5,
            extra: ['-n', '1'] // Windows: send 1 packet
        });

        res.json({
            machineId: machine.id,
            machineName: machine.name,
            target,
            alive: result.alive,
            time: result.time,
            numeric_host: result.numeric_host
        });

    } catch (error) {
        console.error('Ping error:', error);
        res.status(500).json({ error: 'Ping failed', alive: false });
    }
});

// Ping all machines
router.post('/', authenticateBrowser, async (req, res) => {
    try {
        const machines = db.prepare('SELECT id, name, ip_address, hostname FROM machines').all();

        const results = await Promise.all(
            machines.map(async (machine) => {
                const target = machine.ip_address || machine.hostname;

                if (!target) {
                    return {
                        machineId: machine.id,
                        machineName: machine.name,
                        alive: false,
                        error: 'No target address'
                    };
                }

                try {
                    const result = await ping.promise.probe(target, {
                        timeout: 5,
                        extra: ['-n', '1']
                    });

                    return {
                        machineId: machine.id,
                        machineName: machine.name,
                        target,
                        alive: result.alive,
                        time: result.time
                    };
                } catch (error) {
                    return {
                        machineId: machine.id,
                        machineName: machine.name,
                        target,
                        alive: false,
                        error: error.message
                    };
                }
            })
        );

        res.json({ results });

    } catch (error) {
        console.error('Ping all error:', error);
        res.status(500).json({ error: 'Ping all failed' });
    }
});

module.exports = router;
