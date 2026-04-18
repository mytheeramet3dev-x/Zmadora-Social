import "dotenv/config";
import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });

await app.prepare();

const handle = app.getRequestHandler();

const server = createServer(handle);

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
