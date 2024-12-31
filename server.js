const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Azure SQL Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: { encrypt: true },
};

sql.connect(dbConfig)
  .then(() => console.log('Connected to Azure SQL Database'))
  .catch((err) => console.error('Database connection failed:', err.message));

// Register user
app.post('/api/register', async (req, res) => {
  const { username, password, securityQuestion, securityAnswer } = req.body;

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const hashedAnswer = bcrypt.hashSync(securityAnswer, 10);

    const result = await sql.query`INSERT INTO Users (username, password, securityQuestion, securityAnswer) 
                                   VALUES (${username}, ${hashedPassword}, ${securityQuestion}, ${hashedAnswer}); 
                                   SELECT SCOPE_IDENTITY() AS id;`;
    res.send({ id: result.recordset[0].id });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).send('Error registering user');
  }
});

// Login User
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  console.log(`Login attempt for username: ${username}`);
  try {
    const result = await sql.query`SELECT * FROM Users WHERE username = ${username}`;
    if (result.recordset.length === 0) {
      console.log('User not found');
      return res.status(404).send('User not found');
    }

    const user = result.recordset[0];
    console.log('User retrieved from database:', user);

    const isValidPassword = bcrypt.compareSync(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid credentials');
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Generated token:', token);

    res.send({ token, userId: user.id, username: user.username });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).send('Error logging in');
  }
});


app.post('/api/set-target', async (req, res) => {
  const { userId, dailyTarget } = req.body;

  try {
    console.log(`Received set-target request: userId=${userId}, dailyTarget=${dailyTarget}`);
    await sql.query`UPDATE Users SET dailyTarget = ${dailyTarget} WHERE id = ${userId}`;
    res.send('Daily target updated');
  } catch (err) {
    console.error('Error setting daily target:', err.message);
    res.status(500).send('Error setting daily target');
  }
});

app.get('/api/get-target', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await sql.query`SELECT dailyTarget FROM Users WHERE id = ${userId}`;
    if (result.recordset.length === 0) {
      return res.status(404).send('User not found');
    }
    const dailyTarget = result.recordset[0].dailyTarget;
    res.send({ dailyTarget: parseInt(dailyTarget, 10) }); // Ensure numeric value
  } catch (err) {
    console.error('Error fetching daily target:', err.message);
    res.status(500).send('Error fetching daily target');
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await sql.query`SELECT * FROM Users WHERE username = ${username}`;
    if (result.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = result.recordset[0];
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).send('Invalid credentials');
    }

    // Include dailyTarget in the response
    res.send({
      id: user.id,
      username: user.username,
      dailyTarget: user.dailyTarget, // Key part
    });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).send('Error logging in');
  }
});



// Add meal
app.post('/api/add-meal', async (req, res) => {
  const { userId, meal } = req.body;

  try {
    await sql.query`INSERT INTO Meals (userId, name, calories, date) 
                    VALUES (${userId}, ${meal.name}, ${meal.calories}, ${meal.date})`;
    res.send('Meal added');
  } catch (err) {
    console.error('Error adding meal:', err.message);
    res.status(500).send('Error adding meal');
  }
});

// Get meals
app.get('/api/meals', async (req, res) => {
  const { userId } = req.query;

  try {
    const result = await sql.query`SELECT * FROM Meals WHERE userId = ${userId}`;
    res.send(result.recordset);
  } catch (err) {
    console.error('Error fetching meals:', err.message);
    res.status(500).send('Error fetching meals');
  }
});

// Delete meal
app.delete('/api/delete-meal', async (req, res) => {
  const { mealId } = req.body;

  try {
    console.log(`Deleting meal with ID: ${mealId}`);
    await sql.query`DELETE FROM Meals WHERE id = ${mealId}`;
    res.send('Meal deleted successfully');
  } catch (err) {
    console.error('Error deleting meal:', err.message);
    res.status(500).send('Error deleting meal');
  }
});


// Fetch security question
app.get('/api/security-question', async (req, res) => {
  const { username } = req.query;

  try {
    const result = await sql.query`SELECT securityQuestion FROM Users WHERE username = ${username}`;
    if (result.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    res.send({ securityQuestion: result.recordset[0].securityQuestion });
  } catch (err) {
    console.error('Error fetching security question:', err.message);
    res.status(500).send('Error fetching security question');
  }
});

// Password recovery
app.post('/api/recover-password', async (req, res) => {
  const { username, securityAnswer, newPassword } = req.body;

  try {
    const result = await sql.query`SELECT * FROM Users WHERE username = ${username}`;
    if (result.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = result.recordset[0];
    const isAnswerValid = bcrypt.compareSync(securityAnswer, user.securityAnswer);
    if (!isAnswerValid) {
      return res.status(401).send('Invalid security answer');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await sql.query`UPDATE Users SET password = ${hashedPassword} WHERE username = ${username}`;
    res.send('Password reset successful');
  } catch (err) {
    console.error('Error resetting password:', err.message);
    res.status(500).send('Error resetting password');
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await sql.query`SELECT * FROM Users WHERE username = ${username}`;
    if (result.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = result.recordset[0];
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).send('Invalid credentials');
    }

    res.send({
      id: user.id,
      username: user.username,
      dailyTarget: user.dailyTarget, // Include the daily target in the response
    });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).send('Error logging in');
  }
});


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
