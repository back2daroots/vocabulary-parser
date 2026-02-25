import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { parseRoutes } from "./routes/parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(parseRoutes, { prefix: "/api" });
  app.get("/health", async () => ({ status: "ok" }));

  const publicDir = path.join(__dirname, "..", "public");
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
  });
  app.setNotFoundHandler(async (_req, reply) => {
    return reply.sendFile("index.html");
  });

  return app;
}

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

buildApp()
  .then((app) => app.listen({ port, host }))
  .then(() => console.log(`Vocabulary parser listening on http://${host}:${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
