import crypto from 'crypto';
import { prisma } from '../db/database';
import { MachineMetadata, MachineSettings } from '../types';
import { Prisma } from '@prisma/client';

export interface RegisterDTO {
    machineId: string;
    name: string;
    hostname?: string;
    metadata?: MachineMetadata;
}

export interface AdoptDTO {
    machineId: string;
    displayName?: string;
    enableScreenshots: boolean;
    enableActivity: boolean;
    enableAudit: boolean;
    enableAccessControl: boolean;
    accessControlStartTime?: string;
    accessControlEndTime?: string;
    accessControlAction?: 'logoff' | 'shutdown';
}

export interface UpdateMachineDTO {
    name?: string;
    hostname?: string;
    metadata?: MachineMetadata;
}

export class MachineService {

    async register(data: RegisterDTO) {
        const { machineId, name, hostname, metadata } = data;

        // 1. Check if machine already exists by ID
        const existingById = await prisma.machine.findUnique({
            where: { id: machineId }
        });

        if (existingById) {
            return {
                isNew: false,
                apiKey: existingById.apiKey,
                machineId: existingById.id,
                machine: existingById
            };
        }

        // 2. Check if machine exists by Name (Recovery Logic)
        // Only valid if name is provided and not empty
        if (name) {
            const existingByName = await prisma.machine.findFirst({
                where: { name: name }
            });

            if (existingByName) {
                console.log(`♻ Machine recovery: '${name}' matched existing ID ${existingByName.id}. Returning existing credentials.`);
                return {
                    isNew: false,
                    apiKey: existingByName.apiKey,
                    machineId: existingByName.id,
                    machine: existingByName
                };
            }
        }

        // 3. New Machine Registration
        const apiKey = crypto.randomBytes(32).toString('hex');

        const machine = await prisma.machine.create({
            data: {
                id: machineId,
                name,
                hostname: hostname || null,
                apiKey,
                status: 'pending',
                registrationDate: new Date(),
                metadata: JSON.stringify(metadata || {})
            }
        });

        return {
            isNew: true,
            apiKey,
            machineId,
            machine
        };
    }

    async getAll(status?: string, includeArchived: boolean = false) {
        const where: Prisma.MachineWhereInput = {};

        if (status) {
            where.status = status;
        } else if (!includeArchived) {
            where.status = { not: 'archived' };
        }

        const machines = await prisma.machine.findMany({
            where,
            orderBy: { lastSeen: 'desc' },
            include: { state: true }
        });

        return machines.map(row => {
            const lastSeen = row.lastSeen;
            // 300 seconds timeout (5 minutes) to avoid flickering
            const isOnline = lastSeen && (Date.now() - lastSeen.getTime() < 300000);

            return {
                id: row.id,
                name: row.name,
                displayName: row.displayName,
                hostname: row.hostname,
                lastSeen: row.lastSeen,
                isOnline: !!isOnline,
                status: row.status || 'active',
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            };
        });
    }

    async getById(id: string) {
        return prisma.machine.findUnique({
            where: { id }
        });
    }

    async getState(id: string) {
        return prisma.machineState.findUnique({
            where: { machineId: id }
        });
    }

    async update(id: string, data: UpdateMachineDTO) {
        const { name, hostname, metadata } = data;
        const dataToUpdate: Prisma.MachineUpdateInput = {};

        if (name) dataToUpdate.name = name;
        if (hostname) dataToUpdate.hostname = hostname;
        if (metadata) dataToUpdate.metadata = JSON.stringify(metadata);

        return prisma.machine.update({
            where: { id },
            data: dataToUpdate
        });
    }

    async updateDisplayName(id: string, displayName: string | null) {
        return prisma.machine.update({
            where: { id },
            data: { displayName }
        });
    }

    async adopt(data: AdoptDTO) {
        const {
            machineId,
            displayName,
            enableScreenshots,
            enableActivity,
            enableAudit,
            enableAccessControl,
            accessControlStartTime,
            accessControlEndTime,
            accessControlAction
        } = data;

        const machine = await prisma.machine.findUnique({
            where: { id: machineId }
        });

        // ... existing check logic ...
        // Note: The previous view showed "where: { id: machineId }" for findUnique. 
        // I should stick to the structure I saw. Wait, line 140 in previous view was where: { id: machineId }

        if (!machine) {
            throw new Error('Machine not found');
        }

        if (machine.status === 'active') {
            throw new Error('Machine already adopted');
        }

        // Update status and display name
        await prisma.machine.update({
            where: { id: machineId },
            data: {
                status: 'active',
                displayName: displayName || null
            }
        });

        // Construct schedule if enabled
        let schedule = undefined;
        if (enableAccessControl) {
            const start = accessControlStartTime || "09:00";
            const end = accessControlEndTime || "17:00";

            // Create default TimeWindow[] instead of complex AccessSchedule object
            schedule = [
                { dayOfWeek: 1, startTime: start, endTime: end }, // Mon
                { dayOfWeek: 2, startTime: start, endTime: end }, // Tue
                { dayOfWeek: 3, startTime: start, endTime: end }, // Wed
                { dayOfWeek: 4, startTime: start, endTime: end }, // Thu
                { dayOfWeek: 5, startTime: start, endTime: end }, // Fri
                { dayOfWeek: 6, startTime: start, endTime: end }, // Sat
                { dayOfWeek: 0, startTime: start, endTime: end }, // Sun
            ];
        }

        // Create settings
        const initialSettings: MachineSettings = {
            screenshots: {
                enabled: enableScreenshots,
                intervalSeconds: enableScreenshots ? 300 : 0,
                filterDuplicates: true
            },
            network: {
                pingIntervalSeconds: enableActivity ? 300 : 0
            },
            activity: {
                enabled: enableActivity,
                intervalSeconds: 10
            },
            audit: {
                enabled: !!enableAudit,
                filters: {
                    security: !!enableAudit,
                    system: !!enableAudit,
                    application: !!enableAudit
                }
            },
            accessControl: {
                enabled: !!enableAccessControl,
                violationAction: accessControlAction || 'logoff',
                schedule: schedule || []
            }
        };

        // Store settings
        await prisma.machineState.upsert({
            where: { machineId: machineId },
            create: {
                machineId: machineId,
                settings: JSON.stringify(initialSettings),
                updatedAt: new Date()
            },
            update: {
                settings: JSON.stringify(initialSettings),
                updatedAt: new Date()
            }
        });

        return {
            machine,
            settings: initialSettings
        };
    }

    async archive(machineId: string) {
        const machine = await prisma.machine.findUnique({
            where: { id: machineId }
        });

        if (!machine) throw new Error('Machine not found');
        if (machine.status === 'archived') throw new Error('Machine already archived');

        await prisma.machine.update({
            where: { id: machineId },
            data: { status: 'archived' }
        });

        await prisma.connectionEvent.create({
            data: {
                machineId: machineId,
                eventType: 'Archived',
                metadata: JSON.stringify({ archivedAt: new Date().toISOString() })
            }
        });

        return machine;
    }

    async unarchive(machineId: string) {
        const machine = await prisma.machine.findUnique({
            where: { id: machineId }
        });

        if (!machine) throw new Error('Machine not found');
        if (machine.status !== 'archived') throw new Error('Machine is not archived');

        await prisma.machine.update({
            where: { id: machineId },
            data: { status: 'active' }
        });

        await prisma.connectionEvent.create({
            data: {
                machineId: machineId,
                eventType: 'Unarchived',
                metadata: JSON.stringify({ unarchivedAt: new Date().toISOString() })
            }
        });

        return machine;
    }
}

export const machineService = new MachineService();
