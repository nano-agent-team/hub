/**
 * Dev Team Plugin — SQLite ticket database
 */
import Database from 'better-sqlite3';
export declare const DB_PATH: string;
export declare function openDb(): Database.Database;
export declare function nextTicketId(): string;
export interface Ticket {
    id: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    parent_id?: string | null;
    blocked_by?: string | null;
    author?: string | null;
    assigned_to?: string | null;
    labels?: string | null;
    body?: string | null;
    model_hint?: string | null;
    created_at: string;
    updated_at: string;
}
export interface TicketComment {
    id: number;
    ticket_id: string;
    author: string;
    body: string;
    created_at: string;
}
export declare function listTickets(filters?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
}): Ticket[];
export declare function getTicket(id: string): Ticket | undefined;
export declare function createTicket(data: Partial<Ticket> & {
    title: string;
}): Ticket;
export declare function updateTicket(id: string, data: Partial<Omit<Ticket, 'id' | 'created_at'>>, changedBy?: string): Ticket | undefined;
export declare function listComments(ticketId: string): TicketComment[];
export declare function addComment(ticketId: string, author: string, body: string): TicketComment;
