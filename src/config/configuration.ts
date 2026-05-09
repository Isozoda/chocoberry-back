export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'chocoberry_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  currency: process.env.DEFAULT_CURRENCY || 'TJS',
  language: process.env.DEFAULT_LANGUAGE || 'tg',
  bonusPercent: parseFloat(process.env.BONUS_PERCENT_DEFAULT || '2.0'),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY || '',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'chocoberry_tjk_bot',
    botSecret: process.env.TELEGRAM_BOT_SECRET || 'chocoberry_bot_secret',
  },
});
