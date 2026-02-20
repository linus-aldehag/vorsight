import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

/**
 * Standard route parameters for endpoints that use machineId
 */
export interface MachineParams extends ParamsDictionary {
    machineId: string;
}

/**
 * Standard route parameters for endpoints that use a generic id (e.g., screenshot id)
 */
export interface IdParams extends ParamsDictionary {
    id: string;
}

/**
 * Standard query parameters for pagination and filtering
 */
export interface PaginationQuery {
    limit?: string;
    offset?: string;
    cursor?: string;
    machineId?: string;
    [key: string]: string | string[] | undefined;
}

/**
 * TypedRequest helper to simplify Request type definitions.
 * Order: Params, Query, Body (matching Express's generic order but omitting ResBody and Locals)
 */
export type TypedRequest<P = ParamsDictionary, Q = any, B = any> = Request<P, any, B, Q>;

/**
 * Specific typed requests for common patterns
 */
export type MachineRequest<Q = any, B = any> = TypedRequest<MachineParams, Q, B>;
export type IdRequest<Q = any, B = any> = TypedRequest<IdParams, Q, B>;
export type ActionRequest<Q = any, B = any> = TypedRequest<ActionParams, Q, B>;
export type QueryRequest<Q = any> = TypedRequest<ParamsDictionary, Q>;

export interface ActionParams extends ParamsDictionary {
    action: string;
}
