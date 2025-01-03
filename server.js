const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cron = require('node-cron');

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
  const { username, password, securityQuestion, securityAnswer, timeZone } = req.body;

  try {
      const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password
      const hashedAnswer = bcrypt.hashSync(securityAnswer, 10); // Hash the security answer

      // Insert user data into the database, including the timeZone
      await sql.query`
          INSERT INTO Users (username, password, securityQuestion, securityAnswer, timeZone)
          VALUES (${username}, ${hashedPassword}, ${securityQuestion}, ${hashedAnswer}, ${timeZone || 'UTC'});
      `;

      res.send('User registered successfully'); // Success response
  } catch (err) {
      console.error('Error registering user:', err.message); // Log the error
      res.status(500).send('Error registering user'); // Send error response
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
      // Update the daily target and recalculate CaloriesLeft
      await sql.query`
          UPDATE Users
          SET DailyTarget = ${dailyTarget},
              CaloriesLeft = ${dailyTarget} - (
                  SELECT ISNULL(SUM(calories), 0)
                  FROM Meals
                  WHERE Meals.userId = Users.id AND CAST(Meals.timestamp AS DATE) = CAST(GETDATE() AS DATE)
              )
          WHERE id = ${userId};
      `;

      res.send('Daily target and CaloriesLeft updated');
  } catch (err) {
      console.error('Error setting daily target:', err.message);
      res.status(500).send('Error setting daily target');
  }
});



app.get('/api/get-target', async (req, res) => {
  const { userId } = req.query;
  try {
      const result = await sql.query`SELECT DailyTarget, CaloriesLeft FROM Users WHERE id = ${userId}`;
      if (result.recordset.length === 0) {
          return res.status(404).send('User not found');
      }
      const { DailyTarget, CaloriesLeft } = result.recordset[0];
      res.send({ dailyTarget: DailyTarget, caloriesLeft: CaloriesLeft });
  } catch (err) {
      console.error('Error fetching target:', err.message);
      res.status(500).send('Error fetching target');
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

// Verify Token Endpoint
app.post('/api/verify-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).send('Token missing');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Invalid token');
    res.send({ userId: decoded.id }); // Ensure userId is sent back
  });
});


// Add meal 
app.post('/api/add-meal', async (req, res) => {
  const { userId, meal } = req.body;

  // Validate input
  if (!userId || !meal || !meal.name || !meal.calories) {
      return res.status(400).json({ error: 'Invalid input. Please provide valid userId and meal details.' });
  }

  try {
      // Insert meal and fetch the newly added record
      const result = await sql.query`
          INSERT INTO Meals (userId, name, calories, timestamp) 
          VALUES (${userId}, ${meal.name}, ${meal.calories}, GETDATE());

          UPDATE Users
          SET CaloriesLeft = CaloriesLeft - ${meal.calories}
          WHERE id = ${userId};

          SELECT TOP 1 id, name, calories, timestamp AS date
          FROM Meals
          WHERE userId = ${userId}
          ORDER BY timestamp DESC;
      `;

      // Retrieve the newly added meal
      const newMeal = result.recordset[0];

      // Format the timestamp as an ISO string
      if (newMeal && newMeal.date) {
          newMeal.date = new Date(newMeal.date).toISOString(); // Convert timestamp to ISO format
      }

      // Send the new meal as a response
      res.status(201).json(newMeal);
  } catch (err) {
      console.error('Error adding meal:', err.message);
      res.status(500).json({ error: 'Error adding meal. Please try again later.' });
  }
});



// Get meals
app.get('/api/meals', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
      return res.status(400).send('Missing userId parameter');
  }

  try {
      const result = await sql.query`
          SELECT id, name, calories, timestamp AS date
          FROM Meals
          WHERE userId = ${userId}
          ORDER BY timestamp DESC
      `;

      // Map the recordset to ensure the date is in ISO format
      const meals = result.recordset.map((meal) => ({
          ...meal,
          date: meal.date ? new Date(meal.date).toISOString() : null,
      }));

      res.json(meals); // Send the meals in JSON format
  } catch (err) {
      console.error('Error fetching meals:', err.message);
      res.status(500).send('Error fetching meals');
  }
});



// Delete meal
app.delete('/api/delete-meal', async (req, res) => {
  const { mealId, userId } = req.body; // Ensure `userId` is sent from the frontend

  try {
      // Delete the meal
      await sql.query`DELETE FROM Meals WHERE id = ${mealId}`;

      // Recalculate CaloriesLeft
      await sql.query`
          UPDATE Users
          SET CaloriesLeft = DailyTarget - (
              SELECT ISNULL(SUM(calories), 0)
              FROM Meals
              WHERE Meals.userId = Users.id AND CAST(Meals.timestamp AS DATE) = CAST(GETDATE() AS DATE)
          )
          WHERE id = ${userId};
      `;

      res.send('Meal deleted and CaloriesLeft updated');
  } catch (err) {
      console.error('Error deleting meal:', err.message);
      res.status(500).send('Failed to delete meal');
  }
});

// Delete a common meal
app.delete('/api/common-meals/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send('Missing meal ID.');
  }

  try {
    await sql.query`DELETE FROM CommonMeals WHERE id = ${id}`;
    res.send('Common meal deleted successfully.');
  } catch (err) {
    console.error('Error deleting common meal:', err.message);
    res.status(500).send('Error deleting common meal.');
  }
});


// Save a common meal
app.post('/api/common-meals', async (req, res) => {
  const { userId, meal } = req.body;

  if (!userId || !meal || !meal.name || !meal.calories) {
    return res.status(400).send('Invalid meal data.');
  }

  try {
    await sql.query`INSERT INTO CommonMeals (userId, name, calories) VALUES (${userId}, ${meal.name}, ${meal.calories})`;
    res.status(201).send('Common meal added successfully.');
  } catch (err) {
    console.error('Error adding common meal:', err.message);
    res.status(500).send('Error adding common meal.');
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

app.post('/api/logout', (req, res) => {
  // Invalidate session logic here (e.g., clear token, etc.)
  res.status(200).send({ message: 'Logged out successfully' });
});


// Adds common meals
app.post('/api/add-common-meal', async (req, res) => {
  const { userId, meal } = req.body;

  try {
    await sql.query`INSERT INTO CommonMeals (userId, name, calories) VALUES (${userId}, ${meal.name}, ${meal.calories})`;
    res.send('Common meal added');
  } catch (err) {
    console.error('Error adding common meal:', err.message);
    res.status(500).send('Error adding common meal');
  }
});

// Fetch common meals
app.get('/api/common-meals', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
      return res.status(401).send('Token is missing');
  }

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
      const userId = decoded.id; // Extract userId from the token

      // Query the database for meals belonging to this user
      const result = await sql.query`
          SELECT * FROM CommonMeals WHERE userId = ${userId}
      `;
      res.send(result.recordset); // Send meals back to the client
  } catch (err) {
      console.error('Error fetching common meals:', err.message);
      res.status(500).send('Error fetching common meals');
  }
});




// Save a common meal
app.post('/api/common-meal', async (req, res) => {
  const { userId, name, calories } = req.body;

  try {
    await sql.query`INSERT INTO Meals (userId, name, calories) VALUES (${userId}, ${name}, ${calories})`;
    res.status(200).send('Common meal saved successfully');
  } catch (err) {
    console.error('Error saving common meal:', err);
    res.status(500).send('Error saving common meal');
  }
});


// Endpoint to log weight
// Log a weight entry
app.post('/api/weight-log', async (req, res) => {
  const { userId, weight } = req.body;

  // Validate input
  if (!userId || !weight) {
    return res.status(400).send('Invalid input.');
  }

  try {
    const timestamp = new Date().toISOString(); // Generate current timestamp

    // Insert weight log into the WeightTracking database
    await sql.query`INSERT INTO WeightTracking (userId, weight, timestamp) VALUES (${userId}, ${weight}, ${timestamp})`;

    res.status(200).send('Weight logged successfully');
  } catch (err) {
    console.error('Error logging weight:', err);
    res.status(500).send('Error logging weight');
  }
});


// Endpoint to fetch weight history
// Endpoint to fetch weight history with filtering
app.get('/api/weight-history', async (req, res) => {
  const { userId, filter } = req.query;

  if (!userId) {
    return res.status(400).send("User ID is required.");
  }

  try {
    let query = `SELECT * FROM WeightTracking WHERE userId = ${userId}`;
    
    if (filter && filter !== "all") {
      const now = new Date();
      let cutoffDate;

      switch (filter) {
        case "1day":
          cutoffDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case "7days":
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "1month":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "3months":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case "6months":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
          break;
        case "1year":
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        case "2years":
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 2));
          break;
        default:
          break;
      }

      query += ` AND timestamp >= '${cutoffDate.toISOString()}'`;
    }

    const result = await sql.query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching weight history:", error);
    res.status(500).send("Error fetching weight history.");
  }
});


// Endpoint to delete weight entry
app.delete('/api/delete-weight', async (req, res) => {
  const { weightId } = req.body;
  console.log(`Received weight ID for deletion: ${weightId}`); // Debug log

  // Validate weightId
  if (!weightId) {
    return res.status(400).send('Weight ID is required.');
  }

  try {
    // Delete the weight entry with the given weightId
    const result = await sql.query`DELETE FROM WeightTracking WHERE id = ${weightId}`;

    // Check if the deletion was successful
    if (result.rowsAffected[0] > 0) {
      res.send('Weight entry deleted successfully');
    } else {
      res.status(404).send('Weight entry not found.');
    }
  } catch (err) {
    console.error('Error deleting weight entry:', err);
    res.status(500).send('Failed to delete weight entry.');
  }
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running daily CaloriesLeft reset...');
  try {
      // Reset CaloriesLeft to DailyTarget minus today's consumed calories
      const result = await sql.query(`
          UPDATE Users
          SET CaloriesLeft = DailyTarget - (
              SELECT ISNULL(SUM(calories), 0)
              FROM Meals
              WHERE Meals.userId = Users.id AND CAST(Meals.timestamp AS DATE) = CAST(GETDATE() AS DATE)
          )
      `);
      console.log('CaloriesLeft reset completed:', result.rowsAffected);
  } catch (error) {
      console.error('Error during CaloriesLeft reset:', error.message);
  }
});





// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
