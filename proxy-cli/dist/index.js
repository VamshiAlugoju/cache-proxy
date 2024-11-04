#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const commander_1 = require("commander");
const express_1 = __importDefault(require("express"));
const redis = new ioredis_1.default({
    host: 'localhost',
    port: 6379,
});
const app = (0, express_1.default)();
app.use((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const url = req.url;
    console.log(req.method.toUpperCase(), req.url);
    if (req.method !== 'GET') {
        next();
        return;
    }
    const cachedRes = yield redis.get(url);
    if (cachedRes) {
        res.setHeader('X-CACHE', 'HIT');
        res.send(cachedRes);
        return;
    }
    const response = yield fetch(program.opts().origin + req.url);
    const responseType = response.headers.get('content-type');
    let data;
    if (responseType && responseType.includes('application/json')) {
        data = yield response.json();
        yield redis.set(req.url, JSON.stringify(data));
    }
    else {
        data = yield response.text();
        yield redis.set(req.url, String(data));
    }
    res.setHeader('X-CACHE', 'MISS');
    res.send(data);
}));
function startServer(port, origin) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Starting server on port ${port}, targeting ${origin}`);
            app.listen(port, () => {
                console.log(`Listening on port ${port}`);
            });
        }
        catch (err) {
            console.error("Error starting server:", err);
        }
    });
}
const program = new commander_1.Command();
program
    .command('start')
    .description('A caching proxy server CLI')
    .version('1.0.0')
    .option('--port <number>', 'Port of the proxy server', '3000') // Set a default port
    .option('--origin <url>', 'Target server origin') // No default for origin
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
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield redis.flushall();
        console.log('Cache cleared successfully.');
    }
    catch (err) {
        console.error('Error clearing cache:', err);
        process.exit(1);
    }
    process.exit(0);
}));
program.parse(process.argv);
