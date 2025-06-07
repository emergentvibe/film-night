const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('DATABASE_URL from .env:', process.env.DATABASE_URL); 