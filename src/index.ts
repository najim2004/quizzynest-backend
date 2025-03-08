import app from "./app";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

app.start(PORT).catch((error) => {
  console.error("[Fatal] Server failed to start:", error);
  process.exit(1);
});
