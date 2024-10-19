const supabase = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Lógica de registro
const registro = async (req, res) => {
    const { nombres, apellidos, correo, usuario, password, telefono, direccion, edad } = req.body;

    try {
        // Validaciones
        if (!nombres || !apellidos || !correo || !usuario || !password || !telefono || !direccion || !edad) {
            return res.status(400).json({ error: 'Por favor, llena todos los campos para poder registrarte.' });
        }

        if (parseInt(edad) < 15) {
            return res.status(400).json({ error: 'Debes tener al menos 15 años para registrarte.' });
        }

        // Verificar si el usuario o correo ya existen
        const { data: DatoExistente, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .or(`correo.eq.${correo},usuario.eq.${usuario}`)
            .single();

        if (userError && userError.code !== 'PGRST116') {
            console.error('Error al verificar usuario/correo:', userError);
            return res.status(500).json({ error: 'Hubo un error al verificar los datos. Inténtalo de nuevo más tarde.' });
        }

        if (DatoExistente) {
            if (DatoExistente.correo === correo) {
                return res.status(400).json({ error: 'El correo ya está registrado. Por favor, usa otro.' });
            } else if (DatoExistente.usuario === usuario) {
                return res.status(400).json({ error: 'El usuario ya existe. Por favor, elige otro.' });
            }
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Guardar el usuario en Supabase
        const { data, error } = await supabase
        .from('usuarios')
        .insert([{
            nombres,
            apellidos,
            correo,
            usuario,
            password: hashedPassword,
            telefono,
            direccion,
            edad: parseInt(edad),
            rol: 'usuario',
            nivel_aprendizaje: 'principiante'
        }])
        .select();  // Agrega esto para obtener la respuesta completa

        console.log('Data insertada:', data);
        console.log('Error en inserción:', error);

        if (error) {
            console.error('Error al registrar usuario:', error);
            return res.status(500).json({ error: 'Hubo un error en el registro. Verifica que el correo y usuario no estén registrados.' });
        }

        if (!data || data.length === 0) {
            return res.status(500).json({ error: 'No se pudo registrar el usuario. Intenta nuevamente.' });
        }

        res.status(201).json({ message: 'Usuario registrado', user: data[0] });
    } catch (error) {
        console.error("Error en el registro", error);
        res.status(500).json({ error: 'Error en el registro' });
    }
};

// Lógica de inicio de sesión
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscar el usuario en Supabase
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar la contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar el JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.tipo 
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );
        
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el inicio de sesión' });
    }
};

module.exports = { registro, login };
