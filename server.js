import app from "./app.js";
import bot from './bot.js'; // Импортируй бот
const PORT = process.env.PORT || 3000;

async function main() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main()