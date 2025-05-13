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
        .select();

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
                role: user.rol 
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

const updateUser = async (req, res) => {
    const { id, nombres, apellidos, correo, usuario, password, telefono, direccion, edad, rol, nivel_aprendizaje } = req.body;

    try {
        // Validación básica
        if (!id) {
            return res.status(400).json({ error: 'El ID de usuario es obligatorio para actualizar' });
        }

        // Obtener los datos actuales del usuario desde la base de datos
        const { data: existingUser, error: fetchError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Comprobar si el correo o el usuario han sido modificados y si ya existen en otros registros
        if (correo && correo !== existingUser.correo) {
            const { data: correoExists } = await supabase
                .from('usuarios')
                .select('id')
                .eq('correo', correo)
                .single();

            if (correoExists && correoExists.id !== id) {
                return res.status(400).json({ error: 'El correo ya está registrado por otro usuario.' });
            }
        }

        if (usuario && usuario !== existingUser.usuario) {
            const { data: usuarioExists } = await supabase
                .from('usuarios')
                .select('id')
                .eq('usuario', usuario)
                .single();

            if (usuarioExists && usuarioExists.id !== id) {
                return res.status(400).json({ error: 'El nombre de usuario ya está en uso por otro usuario.' });
            }
        }

        // Crear un objeto solo con los campos que han cambiado
        const updateData = {};

        if (nombres && nombres !== existingUser.nombres) updateData.nombres = nombres;
        if (apellidos && apellidos !== existingUser.apellidos) updateData.apellidos = apellidos;
        if (correo && correo !== existingUser.correo) updateData.correo = correo;
        if (usuario && usuario !== existingUser.usuario) updateData.usuario = usuario;
        if (telefono && telefono !== existingUser.telefono) updateData.telefono = telefono;
        if (direccion && direccion !== existingUser.direccion) updateData.direccion = direccion;
        if (edad && edad !== existingUser.edad) updateData.edad = edad;
        if (rol && rol !== existingUser.rol) updateData.rol = rol;
        if (nivel_aprendizaje && nivel_aprendizaje !== existingUser.nivel_aprendizaje) updateData.nivel_aprendizaje = nivel_aprendizaje;

        // Verificar si se proporciona una nueva contraseña para actualizarla
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        // Si no hay datos que actualizar, retornar un mensaje indicando que no hubo cambios
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No se detectaron cambios para actualizar.' });
        }

        // Actualizar los datos en Supabase
        const { data, error } = await supabase
            .from('usuarios')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Error al actualizar usuario:', error);
            return res.status(500).json({ error: 'Hubo un error al actualizar los datos del usuario.' });
        }

        res.status(200).json({ message: 'Datos actualizados exitosamente', user: data });
    } catch (error) {
        console.error('Error en la actualización de usuario', error);
        res.status(500).json({ error: 'Error al actualizar datos del usuario' });
    }
};


module.exports = { registro, login, updateUser };
