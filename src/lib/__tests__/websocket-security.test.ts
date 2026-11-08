import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Cover transitive Engine.IO/Socket.IO copies as well as the direct server dependency.
// These versions include fixes for GHSA-96hv-2xvq-fx4p and GHSA-73jw-fp74-p77x.
describe('WebSocket dependency security', () => {
    it('keeps every resolved ws copy on the patched release line', () => {
        const lock = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'));
        const copies = Object.entries(lock.packages).filter(([name]) => /(^|\/)node_modules\/ws$/.test(name));
        expect(copies.length).toBeGreaterThan(0);
        for (const [name, entry] of copies) {
            const version = (entry as { version: string }).version;
            const [major, minor, patch] = version.split('.').map(Number);
            expect(major, `${name}: ${version}`).toBe(8);
            expect(minor > 22 || (minor === 22 && patch >= 1), `${name}: ${version}`).toBe(true);
        }
    });

    it('applies the direct dependency constraint to transitive copies', () => {
        const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
        expect(pkg.overrides.ws).toBe('$ws');
    });
});

import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

describe('patched WebSocket compatibility', () => {
    it('round-trips a fragmented message over the direct ws dependency', async () => {
        const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
        await once(server, 'listening');
        const client = new WebSocket(`ws://127.0.0.1:${(server.address() as AddressInfo).port}`);
        try {
            server.on('connection', socket => socket.on('message', data => socket.send(data)));
            await once(client, 'open');
            const reply = once(client, 'message');
            client.send('hello ', { fin: false });
            client.send('world', { fin: true });
            expect((await reply)[0].toString()).toBe('hello world');
        } finally {
            client.terminate();
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });

    it('round-trips Socket.IO events using the overridden websocket transport', async () => {
        const http = createServer();
        const server = new Server(http);
        server.on('connection', socket => socket.on('security-smoke', (value, ack) => ack(value)));
        http.listen(0, '127.0.0.1');
        await once(http, 'listening');
        const client = io(`http://127.0.0.1:${(http.address() as AddressInfo).port}`, {
            transports: ['websocket'], reconnection: false,
        });
        try {
            await new Promise<void>((resolve, reject) => {
                client.once('connect', resolve);
                client.once('connect_error', reject);
            });
            expect(await client.timeout(2000).emitWithAck('security-smoke', 'hello')).toBe('hello');
        } finally {
            client.disconnect();
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });
});
