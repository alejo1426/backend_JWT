// server.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./rutas/authRutas');
require('dotenv').config(); // Cargar variables de entorno

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Para parsear el cuerpo de las solicitudes como JSON

// Rutas
app.use('/api/auth', authRoutes); // Todas las rutas de autenticación comenzarán con /api/auth

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
