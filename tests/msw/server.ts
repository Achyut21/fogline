import { setupServer } from "msw/node";

export const server = setupServer();

export const unhandled: string[] = [];
