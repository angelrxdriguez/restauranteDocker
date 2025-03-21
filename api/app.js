const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors'); // Importa CORS
const app = express();

// Habilita CORS para todas las solicitudes
app.use(cors());

app.use(express.json());

// Conexión a MongoDB
//const uri = "mongodb+srv://angelrp:abc123.@cluster0.76po7.mongodb.net/restaurante?retryWrites=true&w=majority&appName=Cluster0";
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error(" ERROR: La variable de entorno MONGO_URI no está definida.");
  process.exit(1); // Detiene la ejecución si no hay URI
}
else{
  console.log(uri);
  
}
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let collection;

// Función para conectar con la base de datos
async function connectToDB() {
  try {
    await client.connect();
    const database = client.db('restaurante');
    collection = database.collection('usuarios');
    console.log("Conectado a MongoDB");
  } catch (err) {
    console.error("Error al conectar a MongoDB:", err);
  }
}
connectToDB();

// Endpoint de prueba
app.get('/api/check-db', async (req, res) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
    const test = await collection.findOne();
    res.json({ message: 'Conexión exitosa con MongoDB Atlas', test });
  } catch (error) {
    res.status(500).json({ message: 'Error al conectar con MongoDB', error });
  }
});

// Para ver si funciona
app.get('/api', (req, res) => {
  res.json({ message: 'Bienvenido a la API hola joel hola' });
});

// Registro de usuario
app.post("/api/register", async (req, res) => {
  try {
    console.log(req.body);  // Verifica que los datos lleguen correctamente
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios." });
    }

    // Verificar si el correo ya existe
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Este correo ya está registrado." });
    }

    // Guardar el nuevo usuario 
    await collection.insertOne({ email, password });

    res.status(201).json({ success: true, message: "Usuario registrado correctamente." });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});
//login
app.post("/api/login", async (req, res) => {
  try {
      console.log("Datos recibidos en /api/login:", req.body);
      const { email, password } = req.body;

      if (!email || !password) {
          return res.status(400).json({ success: false, message: "Todos los campos son obligatorios." });
      }

      const user = await collection.findOne({ email, password });

      if (!user) {
          return res.status(401).json({ success: false, message: "Correo o contraseña incorrectos." });
      }

      res.status(200).json({ success: true, message: "Inicio de sesión exitoso." });
  } catch (error) {
      console.error("🔥 Error en el login:", error);
      res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});
//cerar reserva
app.post("/api/reservas", async (req, res) => {
  try {
      const { nombre, telefono, comensales, fecha, hora } = req.body;

      if (!nombre || !telefono || !comensales || !fecha || !hora) {
          return res.status(400).json({ success: false, message: "Todos los campos son obligatorios." });
      }

      const fechaReserva = new Date(fecha);

      await client.db("restaurante").collection("reservas").insertOne({
          nombre,
          telefono,
          comensales: parseInt(comensales),
          fecha: fechaReserva,
          hora
      });

      res.status(201).json({ success: true, message: "Reserva creada exitosamente." });
  } catch (error) {
      console.error("Error al crear la reserva:", error);
      res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});
app.get("/api/reservas", async (req, res) => {
  try {
    const reservas = await client.db("restaurante").collection("reservas").find().toArray();
    res.status(200).json({ success: true, reservas });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({ success: false, message: "Error al obtener las reservas." });
  }
});

const { ObjectId } = require("mongodb"); // Importar ObjectId para manejar IDs de MongoDB

// Eliminar reservaa
app.delete("/api/reservas/:id", async (req, res) => {
  try {
    const reservaId = req.params.id;

    // Verificar que el ID es válido
    if (!ObjectId.isValid(reservaId)) {
      return res.status(400).json({ success: false, message: "ID de reserva no válido." });
    }

    // Eliminar la reserva de la base de datos
    const resultado = await client.db("restaurante").collection("reservas").deleteOne({ _id: new ObjectId(reservaId) });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada." });
    }

    res.json({ success: true, message: "Reserva eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar la reserva:", error);
    res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});




let cestaGlobal = []; 

// Obtener los productos de la cesta 
app.get("/api/cesta", async (req, res) => {
  try {
    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    const productos = await cestaCollection.find().toArray();
    res.status(200).json({ success: true, cesta: productos });

  } catch (error) {
    console.error("Error al obtener la cesta:", error);
    res.status(500).json({ success: false, message: "Error al obtener la cesta." });
  }
});


// Agregar producto a la cesta y guardarlo en la base de datos
app.post("/api/cesta", async (req, res) => {
  try {
    const { productoId, nombre, precio, imagen, cantidad } = req.body;

    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    const existente = await cestaCollection.findOne({ productoId });

    if (existente) {

      await cestaCollection.updateOne(
        { productoId },
        { $inc: { cantidad: cantidad } }
      );
    } else {

      await cestaCollection.insertOne({
        productoId,
        nombre,
        precio,
        imagen,
        cantidad
      });
    }

    res.status(201).json({ success: true, message: "Producto agregado a la cesta." });

  } catch (error) {
    console.error("Error al agregar producto a la cesta:", error);
    res.status(500).json({ success: false, message: "Error al agregar producto a la cesta." });
  }
});



// Eliminar un producto de la cesta en la base de datos
app.delete("/api/cesta/:productoId", async (req, res) => {
  try {
    const { productoId } = req.params;
    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    const resultado = await cestaCollection.deleteOne({ productoId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado en la cesta." });
    }

    res.status(200).json({ success: true, message: "Producto eliminado de la cesta." });

  } catch (error) {
    console.error("Error al eliminar producto de la cesta:", error);
    res.status(500).json({ success: false, message: "Error al eliminar producto de la cesta." });
  }
});

//obtener los productos de la cesta
app.get("/api/cesta", async (req, res) => {
  try {
    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    const productos = await cestaCollection.find().toArray();
    res.status(200).json({ success: true, cesta: productos });

  } catch (error) {
    console.error("Error al obtener la cesta:", error);
    res.status(500).json({ success: false, message: "Error al obtener la cesta." });
  }
});

// procesar el pedido y almacenarlo en la base de datos
app.post("/api/pedidos", async (req, res) => {
  try {
    const { cliente, pago, productos, total } = req.body;

    if (!cliente || !pago || !productos || !total) {
      return res.status(400).json({ success: false, message: "Faltan datos para procesar el pedido." });
    }

    const db = client.db("restaurante");
    const pedidosCollection = db.collection("pedidos");

    // Crear el nuevo pedido
    const nuevoPedido = {
      cliente,
      pago,
      productos,
      total,
      fecha: new Date(),
    };

    // Guardar el pedido en la base de datos
    const result = await pedidosCollection.insertOne(nuevoPedido);

    //eliminar la cesta al pagar
    const cestaCollection = db.collection("productos");
    await cestaCollection.deleteMany({}); 

    res.status(201).json({ success: true, message: "Pedido realizado con éxito.", pedidoId: result.insertedId });

  } catch (error) {
    console.error("Error al procesar el pedido:", error);
    res.status(500).json({ success: false, message: "Hubo un error al procesar el pedido." });
  }
});

// obtener todos los pedidos
app.get("/api/pedidos", async (req, res) => {
  try {
    const pedidos = await client.db("restaurante").collection("pedidos").find().toArray();

    
    if (!pedidos || pedidos.length === 0) {
      return res.status(404).json({ success: false, message: "No hay pedidos." });
    }

    // Devolver los pedidos con los productos asociados
    res.status(200).json({
      success: true,
      pedidos: pedidos 
    });
  } catch (error) {
    console.error("Error al obtener los pedidos:", error);
    res.status(500).json({ success: false, message: "Hubo un error al obtener los pedidos." });
  }
  
});

app.delete("/api/pedidos/:id", async (req, res) => {
  try {
    const { id } = req.params; 

    // Validar el id
    if (!id) {
      return res.status(400).json({ success: false, message: "ID de pedido no proporcionado." });
    }

    const db = client.db("restaurante");
    const pedidosCollection = db.collection("pedidos");

    // eliminar el pedido con el ID proporcionado
    const result = await pedidosCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No se encontró el pedido." });
    }

    res.status(200).json({ success: true, message: "Pedido eliminado correctamente." });

  } catch (error) {
    console.error("Error al eliminar el pedido:", error);  // Más detalles del error
    res.status(500).json({ success: false, message: "Hubo un error al eliminar el pedido." });
  }
});


module.exports = app;






























































































//angel