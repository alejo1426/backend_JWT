const express = require('express');
const { registro, login, updateUser } = require('../controllers/authControlador');
const router = express.Router();

router.post('/registro', registro);

router.post('/login', login);

router.put('/actualizar', updateUser);

module.exports = router;
