const express = require('express');
const { registro, login, updateUser } = require('../controllers/authControlador');
const router = express.Router();

// Ruta para registro
router.post('/registro', registro);

// Ruta para inicio de sesión
router.post('/login', login);

router.put('/actualizar', updateUser);

module.exports = router;
