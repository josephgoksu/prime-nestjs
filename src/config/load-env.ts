import * as dotenv from 'dotenv';

// Loads .env into process.env. main.ts imports this first: tracing and the logger
// read their settings at import time, before ConfigModule loads .env. Variables
// already set in the environment win, as with ConfigModule. dotenv >= 17 prints an
// "injected env" line on every call unless told to be quiet.
dotenv.config({ quiet: true });
