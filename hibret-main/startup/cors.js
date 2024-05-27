import cors from "cors";

export default function initCORS(app) {
  app.use(
    cors({
      origin: [
        `https://${process.env.HOST}`,
        `http://${process.env.HOST}`,
        `${process.env.HOST}`,
      ],
      methods: ["GET", "POST", "PUT", "OPTIONS", "DELETE"],
      credentials: true, // enable set cookie
    })
  );

  // Handle preflight requests
  app.options("*", cors());
}
