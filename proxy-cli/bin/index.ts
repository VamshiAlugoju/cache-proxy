#!/usr/bin/env node
import Redis from 'ioredis';
import { Command } from 'commander';
import express from 'express';

const redis = new Redis({
    host: 'localhost',
    port: 6379,
});

const app = express();

app.use(async (req, res, next) => {
    const url = req.url;
    console.log(req.method.toUpperCase(), req.url);
    if (req.method !== 'GET') {
        next();
        return;
    }

    const cachedRes = await redis.get(url);

    if (cachedRes) {
        res.setHeader('X-CACHE', 'HIT');
        res.send(cachedRes);
        return;
    }

    const response = await fetch(program.opts().origin + req.url);
    const responseType = response.headers.get('content-type');
    let data;
    if (responseType && responseType.includes('application/json')) {
        data = await response.json();
        await redis.set(req.url, JSON.stringify(data));
    } else {
        data = await response.text();
        await redis.set(req.url, String(data));
    }

    res.setHeader('X-CACHE', 'MISS');
    res.send(data);
});

async function startServer(port: number, origin: string) {
    try {
        console.log(`Starting server on port ${port}, targeting ${origin}`);
        app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    } catch (err) {
        console.error("Error starting server:", err);
    }
}

const program = new Command();
program
    .command('start')
    .description('A caching proxy server CLI')
    .version('1.0.0')
    .option('--port <number>', 'Port of the proxy server', '3000')  // Set a default port
    .option('--origin <url>', 'Target server origin')               // No default for origin
    .action((options) => {

        const port = options.port;
        const origin = options.origin;

        if (!origin) {
            console.error("Error: The --origin option is required.");
            program.help(); // Display help if origin is missing
            process.exit(1);
        }

        startServer(Number(port), origin);
    });

// Define `clear-cache` as an inline command without affecting global options
program
    .command('clear-cache')
    .description('Clear the cache')
    .action(async () => {
        try {
            await redis.flushall();
            console.log('Cache cleared successfully.');
        } catch (err) {
            console.error('Error clearing cache:', err);
            process.exit(1);
        }
        process.exit(0);
    });


program.parse(process.argv);
