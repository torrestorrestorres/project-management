// Modulimporte
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Konfiguration
const app = express();
const port = 3000;
const secretKey = "supersecurekey"; // Für echte Projekte aus Umgebungsvariablen laden

// PostgreSQL-Datenbank konfigurieren
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'app_user',
  password: process.env.DATABASE_PASSWORD || 'secure_password',
  database: process.env.DATABASE_NAME || 'project_management',
  port: 5432,
});

// Datenbankverbindung testen
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Fehler bei der Verbindung zur Datenbank:', err);
  } else {
    console.log('Datenbank verbunden! Zeit:', res.rows[0].now);
  }
});

// Middleware
app.use(express.json());

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'frontend')));

// Frontend-Route für alle nicht-API-Anfragen
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Sicherheits-Middleware: JWT-Authentifizierung
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).send({ message: "Token fehlt" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send({ message: "Token ungültig" });
    req.user = user; // Benutzerinformationen speichern
    next();
  });
}

// Benutzer-Routen
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fehler beim Abrufen der Benutzer:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});


app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send('Name, Email und Passwort sind erforderlich.');
  }

  try {
    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // Benutzer in der Datenbank speichern
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, hashedPassword]
    );

    res.status(201).json({ id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email });
  } catch (err) {
    console.error('Fehler beim Erstellen eines Benutzers:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});


// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Benutzer suchen
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).send({ message: "Benutzer nicht gefunden" });
    }

    const user = userResult.rows[0];

    // Passwort überprüfen
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: "Falsches Passwort" });
    }

    // Token generieren
    const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (err) {
    console.error('Fehler beim Login:', err);
    res.status(500).send("Ein Fehler ist aufgetreten.");
  }
});


// Auftrags-Routen
app.post('/api/orders', async (req, res) => {
  const { user_id, service_type, details } = req.body;

  if (!user_id || !service_type) {
    return res.status(400).send('Benutzer-ID und Dienstleistung sind erforderlich.');
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, service_type, details) 
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, service_type, details || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Fehler beim Erstellen eines Auftrags:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fehler beim Abrufen der Aufträge:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Auftrag nicht gefunden.');
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Fehler beim Abrufen des Auftrags:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { service_type, status, details } = req.body;

  try {
    const result = await pool.query(
      `UPDATE orders 
       SET service_type = $1, status = $2, details = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [service_type, status, details, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Auftrag nicht gefunden.');
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Fehler beim Aktualisieren des Auftrags:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Auftrag nicht gefunden.');
    }
    res.status(200).send('Auftrag gelöscht.');
  } catch (err) {
    console.error('Fehler beim Löschen des Auftrags:', err);
    res.status(500).send('Ein Fehler ist aufgetreten.');
  }
});

// Server starten
app.listen(port, () => {
  console.log(`Backend läuft auf http://localhost:${port}`);
});
