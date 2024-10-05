// db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Inicializa el cliente de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = supabase;
