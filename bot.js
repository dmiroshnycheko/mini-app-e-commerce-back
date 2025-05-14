import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.BOT_TOKEN) {
  console.error('Error: BOT_TOKEN is not defined in .env');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Обработка команды /start
bot.start(async (ctx) => {
  const tgId = ctx.from.id.toString();
  const referralCode = ctx.startPayload;
  const username = ctx.from.username || '';
  const firstName = ctx.from.first_name || '';

  try {
    // Регистрация или вход через /api/auth/login
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      tgId,
      username,
      firstName,
      referralCode, // Передаём referralCode в /login
    });
    const user = loginResponse.data;
    console.log('User logged in:', { tgId, userId: user.id });

    // Если есть referralCode и пользователь ещё не имеет реферера
    if (referralCode && !user.referrerId) {
      try {
        const referralResponse = await axios.post(
          `${BACKEND_URL}/api/auth/register-referral`,
          { referralCode },
          { headers: { Authorization: `Bearer ${user.accessToken}` } }
        );
        console.log('Referral registered:', referralResponse.data);
        ctx.reply(`Вы зарегистрированы по реферальной ссылке! Добро пожаловать!`);
      } catch (referralError) {
        console.error('Error registering referral:', {
          message: referralError.message,
          response: referralError.response?.data,
          status: referralError.response?.status,
        });
        if (referralError.response?.data?.error === 'Cannot refer yourself') {
          ctx.reply('Ошибка: нельзя использовать собственную реферальную ссылку.');
        } else if (referralError.response?.data?.error === 'Invalid referral code') {
          ctx.reply('Ошибка: недействительный реферальный код.');
        } else {
          ctx.reply('Ошибка привязки реферала. Попробуйте позже.');
        }
        return;
      }
    } else {
      ctx.reply('Добро пожаловать!');
    }
  } catch (error) {
    console.error('Error processing /start:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    ctx.reply(`Ошибка регистрации: ${error.response?.data?.error || 'Попробуйте позже.'}`);
  }
});

// Обработка graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot;