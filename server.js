const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3001;
const nodemailer = require('nodemailer');
const crypto = require('crypto');

app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./todos.db');

// Secret key for JWT
const SECRET_KEY = 'your_secret_key';

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    reset_token TEXT,
    reset_expires INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (list_id) REFERENCES lists (id)
  )`);

  // Create shared lists table
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS shared_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (list_id) REFERENCES lists (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  });
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'martin.cousseau2001@gmail.com',
    pass: 'swux ptvz wnkb nfdg',
  },
});

// Route to request password reset
app.post('/api/request-password-reset', async (req, res) => {
  const { email } = req.body;

  // Check if the user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(404).send('User not found');
    }

    // Generate a unique token
    const token = crypto.randomBytes(20).toString('hex');

    // Save the token and its expiration time in the database
    db.run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?', [
      token,
      Date.now() + 3600000, // 1 hour expiration
      email,
    ]);

    // Send the reset email
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    const mailOptions = {
      from: 'martin.cousseau2001@gmail.com',
      to: email,
      subject: 'Password Reset',
      text: `Click the following link to reset your password: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erreur complète lors de l'envoi d'email:", error);
        return res.status(500).send('Error sending email');
      }
      res.send('Password reset email sent');
    });
  });
});

// Route to reset password
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  // Check if the token is valid and not expired
  db.get('SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?', [
    token,
    Date.now(),
  ], async (err, user) => {
    if (err || !user) {
      return res.status(400).send('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear the reset token
    db.run(
      'UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id],
      function(err) {
        if (err) {
          return res.status(500).send('Error updating password');
        }
        res.send('Password reset successfully');
      }
    );
  });
});

// Register a new user
app.post('/api/register', async (req, res) => {
  const { email, password, confirmPassword, firstName, lastName } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, firstName, lastName],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Error registering user');
        }
        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Login a user
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (!user) {
      return res.status(400).send('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid password');
    }

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Middleware to authenticate user
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Get all lists for the authenticated user
app.get('/api/lists', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.all('SELECT id, name FROM lists WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

// Create a new list for the authenticated user
app.post('/api/lists', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const name = req.body.name || 'Untitled List';
  db.run('INSERT INTO lists (user_id, name) VALUES (?, ?)', [userId, name], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.status(201).json({ listId: this.lastID, listName: name });
    }
  });
});

// Get todos for a specific list
app.get('/api/lists/:listId/todos', (req, res) => {
  const listId = req.params.listId;
  db.all('SELECT id, text, completed FROM todos WHERE list_id = ?', [listId], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

// Create a new todo in a specific list
app.post('/api/lists/:listId/todos', (req, res) => {
  const listId = req.params.listId;
  const text = req.body.text;
  db.run('INSERT INTO todos (list_id, text) VALUES (?, ?)', [listId, text], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.status(201).json({ id: this.lastID, text, completed: false });
    }
  });
});

// Toggle completion status of a todo
app.patch('/api/lists/:listId/todos/:id/toggle', (req, res) => {
  const todoId = req.params.id;
  db.run('UPDATE todos SET completed = NOT completed WHERE id = ?', [todoId], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json({ id: todoId, completed: this.changes ? 1 : 0 });
    }
  });
});

// Delete a list and its associated todos
app.delete('/api/lists/:listId', authenticateToken, (req, res) => {
  const listId = req.params.listId;
  const userId = req.user.userId;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run('DELETE FROM todos WHERE list_id = ?', [listId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).send('Error deleting todos');
      }

      db.run('DELETE FROM lists WHERE id = ? AND user_id = ?', [listId, userId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).send('Error deleting list');
        }

        db.run('COMMIT', function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).send('Error committing transaction');
          }
          res.json({ message: 'List and associated todos deleted successfully' });
        });
      });
    });
  });
});

// Get all users
app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, email, first_name, last_name FROM users WHERE id != ?', [req.user.userId], (err, rows) => {
    if (err) {
      return res.status(500).send('Error retrieving users');
    }
    res.json(rows);
  });
});

// Delete a todo
app.delete('/api/lists/:listId/todos/:todoId', authenticateToken, (req, res) => {
  const todoId = req.params.todoId;
  const listId = req.params.listId;
  const userId = req.user.userId;

  db.run(
    'DELETE FROM todos WHERE id = ? AND list_id IN (SELECT id FROM lists WHERE user_id = ?)',
    [todoId, userId],
    function(err) {
      if (err) {
        return res.status(500).send('Error deleting todo');
      }
      res.json({ message: 'Todo deleted successfully' });
    }
  );
});

// Update a list name
app.patch('/api/lists/:listId', authenticateToken, (req, res) => {
  const listId = req.params.listId;
  const userId = req.user.userId;
  const newName = req.body.name;

  db.run('UPDATE lists SET name = ? WHERE id = ? AND user_id = ?', [newName, listId, userId], function(err) {
    if (err) {
      return res.status(500).send('Error updating list');
    }
    res.json({ message: 'List updated successfully' });
  });
});

// Update a todo text
app.patch('/api/lists/:listId/todos/:todoId', authenticateToken, (req, res) => {
  const todoId = req.params.todoId;
  const listId = req.params.listId;
  const userId = req.user.userId;
  const newText = req.body.text;

  db.run(
    'UPDATE todos SET text = ? WHERE id = ? AND list_id IN (SELECT id FROM lists WHERE user_id = ?)',
    [newText, todoId, userId],
    function(err) {
      if (err) {
        return res.status(500).send('Error updating todo');
      }
      res.json({ message: 'Todo updated successfully' });
    }
  );
});

// Share a list with another user with email notification
app.post('/api/lists/:listId/share', authenticateToken, (req, res) => {
  const listId = req.params.listId;
  const userIdToShareWith = req.body.userId;
  const ownerUserId = req.user.userId;

  // Check if the user owns the list
  db.get('SELECT * FROM lists WHERE id = ? AND user_id = ?', [listId, ownerUserId], (err, list) => {
    if (err || !list) {
      return res.status(404).send('List not found or unauthorized');
    }

    // Share the list by inserting into shared_lists
    db.run('INSERT INTO shared_lists (list_id, user_id) VALUES (?, ?)', [listId, userIdToShareWith], function(err) {
      if (err) {
        return res.status(500).send('Error sharing list');
      }
      
      // Retrieve information of the user with whom the list is shared
      db.get('SELECT email, first_name FROM users WHERE id = ?', [userIdToShareWith], (err, sharedUser) => {
        if (err || !sharedUser) {
          console.error("Erreur lors de la récupération de l'utilisateur partagé :", err);
          // Même si l'envoi de l'email échoue, on retourne quand même un succès pour le partage
          return res.json({ message: 'List shared successfully (but email notification failed)' });
        }

        // Compose the notification email
        const listLink = `http://localhost:3000`; // Adapte ce lien selon ton front-end
        const mailOptions = {
          from: 'martin.cousseau2001@gmail.com',
          to: sharedUser.email,
          subject: 'Une liste vous a été partagée',
          text: `Bonjour ${sharedUser.first_name || ''},

La liste "${list.name}" vous a été partagée. Connectez-vous à votre compte pour la consulter.

Lien : ${listLink}

Cordialement,
Votre application Todo List`
        };

        // Send the email notification
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Erreur lors de l'envoi de la notification par email :", error);
            return res.json({ message: 'List shared successfully, but failed to send notification email.' });
          }
          console.log('Email de notification envoyé : ' + info.response);
          return res.json({ message: 'List shared successfully and notification email sent.' });
        });
      });
    });
  });
});

// Get shared lists for a user
app.get('/api/shared-lists', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.all('SELECT l.id, l.name FROM lists l JOIN shared_lists sl ON l.id = sl.list_id WHERE sl.user_id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).send('Error retrieving shared lists');
    }
    res.json(rows);
  });
});

// Apply authentication middleware to protected routes
app.use('/api/lists', authenticateToken);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
