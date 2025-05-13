import app from "./app.js";
import bot from './bot.js';

const PORT = process.env.PORT || 3000;

async function main() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  try {
    await bot.launch();
    console.log('Bot is running');
  } catch (err) {
    console.error('Failed to launch bot:', err.message);
    process.exit(1);
  }
}

main();
