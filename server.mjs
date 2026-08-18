import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const requiredEnvVars = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
  "PUSHER_APP_ID",
  "PUSHER_SECRET",
  "BLOB_READ_WRITE_TOKEN",
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    for (const name of missing) {
      console.error(`- ${name}`);
    }
    console.error("Populate your .env file before starting the app.");
    process.exit(1);
  }
}

validateEnvironment();

const app = next({ dev, hostname, port });

await app.prepare();

const handle = app.getRequestHandler();

const server = createServer(handle);

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
