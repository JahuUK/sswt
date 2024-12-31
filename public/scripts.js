let userId = null;
let commonMeals = []; // Array to store common meals


// Utility: Toggle section visibility
function toggleSection(sectionToShow) {
  const sections = ['login', 'register', 'recover-password', 'dashboard'];
  sections.forEach(section => {
    const element = document.getElementById(section);
    if (element) {
      element.style.display = section === sectionToShow ? 'block' : 'none';
    }
  });
}

// User Registration
async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const securityQuestion = document.getElementById('security-question').value;
  const securityAnswer = document.getElementById('security-answer').value;

  if (!securityQuestion) return alert('Please select a security question.');

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, securityQuestion, securityAnswer }),
    });

    if (response.ok) {
      alert('Registration successful!');
      toggleSection('login');
    } else {
      alert('Error during registration.');
    }
  } catch (err) {
    console.error('Error during registration:', err);
    alert('Failed to register. Please try again.');
  }
}

// User Login
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem('token', data.token);
      userId = data.userId; // Ensure global userId is set

      console.log(`User logged in. userId: ${userId}`);
      showDashboard();
    } else {
      alert('Invalid credentials');
    }
  } catch (err) {
    console.error('Error during login:', err);
    alert('Failed to log in. Please try again.');
  }
}



// Password Recovery
async function recoverPassword() {
  const username = document.getElementById('recover-username').value;
  const securityAnswer = document.getElementById('recover-security-answer').value;
  const newPassword = document.getElementById('new-password').value;

  try {
    const response = await fetch('/api/recover-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, securityAnswer, newPassword }),
    });

    if (response.ok) {
      alert('Password reset successful!');
      toggleSection('login');
    } else {
      alert('Error during password recovery.');
    }
  } catch (err) {
    console.error('Error during password recovery:', err);
  }
}

// Set Daily Target
async function setTarget() {
    const dailyTargetInput = document.getElementById('daily-target-input');
    const dailyTarget = parseInt(dailyTargetInput.value, 10);

    if (isNaN(dailyTarget) || dailyTarget <= 0) {
        alert('Please enter a valid daily target.');
        return;
    }

    try {
        const response = await fetch('/api/set-target', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, dailyTarget }),
        });

        if (response.ok) {
            alert('Daily target updated successfully!');
            updateDailyTargetDisplay(dailyTarget); // Update the display value
            calculateCaloriesLeft(); // Recalculate the calories left
        } else {
            alert('Failed to update daily target. Please try again.');
        }
    } catch (err) {
        console.error('Error setting daily target:', err);
        alert('Error updating daily target. Please try again.');
    }
}

// Add Meal
async function addMeal() {
  const name = document.getElementById('meal-name').value;
  const calories = document.getElementById('meal-calories').value;

  if (!name || !calories || calories <= 0) return alert('Please provide valid meal details.');

  try {
    await fetch('/api/add-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, meal: { name, calories, date: new Date() } }),
    });
    loadMeals();
    calculateCaloriesLeft();
    document.getElementById('meal-name').value = '';
    document.getElementById('meal-calories').value = '';
  } catch (err) {
    console.error('Error adding meal:', err);
    alert('Failed to add meal. Please try again.');
  }
}

// Load Meals
async function loadMeals() {
  if (!userId) {
    console.error('User ID is null. Unable to load meals.');
    return;
  }

  try {
    const response = await fetch(`/api/meals?userId=${userId}`);
    if (!response.ok) {
      console.error(`Failed to fetch meals. Status: ${response.status}`);
      return;
    }

    const meals = await response.json();

    // Clear existing meals
    const mealsList = document.getElementById('meals-list');
    mealsList.innerHTML = '';

    // Render the meals
    meals.forEach(meal => {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
      
      li.innerHTML = `
        <div>
          <span>${meal.name} - ${meal.calories} calories</span>
          <small class="text-muted d-block">${new Date(meal.timestamp).toLocaleString()}</small>
        </div>
        <button class="btn-delete" onclick="deleteMeal(${meal.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;
      
      mealsList.appendChild(li);
    });
  } catch (err) {
    console.error('Error loading meals:', err.message);
  }
}


// Delete Meal
async function deleteMeal(mealId) {
  try {
    const response = await fetch('/api/delete-meal', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealId }),
    });

    if (response.ok) {
      console.log('Meal deleted successfully!');
      loadMeals();
      calculateCaloriesLeft();
    } else {
      alert('Error deleting meal. Please try again.');
    }
  } catch (err) {
    console.error('Error deleting meal:', err);
  }
}

// Calculate Calories Left
async function calculateCaloriesLeft() {
  try {
    const [targetResponse, mealsResponse] = await Promise.all([
      fetch(`/api/get-target?userId=${userId}`),
      fetch(`/api/meals?userId=${userId}`)
    ]);

    if (targetResponse.ok && mealsResponse.ok) {
      const targetData = await targetResponse.json();
      const mealsData = await mealsResponse.json();

      const dailyTarget = targetData.dailyTarget || 0;
      const totalCaloriesConsumed = mealsData.reduce((total, meal) => total + parseInt(meal.calories, 10), 0);
      const caloriesLeft = Math.max(dailyTarget - totalCaloriesConsumed, 0);

      document.getElementById('calories-left-value').textContent = `${caloriesLeft} calories`;
      document.getElementById('calories-left').style.display = 'block';
    } else {
      console.error('Failed to fetch target or meals.');
    }
  } catch (err) {
    console.error('Error calculating calories left:', err);
  }
}

// Update Daily Target Display
function updateDailyTargetDisplay(dailyTarget) {
  const dailyTargetElement = document.getElementById('daily-target-value');
  if (dailyTargetElement) dailyTargetElement.textContent = `${dailyTarget} calories`;
}

// Check Session
async function checkSession() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const navBar = document.querySelector('nav');

  if (!token) {
    // Redirect to login if no token is present
    toggleSection('login');
    if (navBar) navBar.style.display = 'none';
    userId = null;
    return;
  }

  try {
    const response = await fetch('/api/verify-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      userId = data.userId; // Set the global userId
      console.log(`Session verified. User ID: ${userId}`);
      showDashboard(); // Show the dashboard
      if (navBar) navBar.style.display = 'flex'; // Show nav bar
    } else {
      throw new Error('Invalid session');
    }
  } catch (err) {
    console.error('Error verifying session:', err);
    toggleSection('login');
    if (navBar) navBar.style.display = 'none';
    userId = null; // Reset userId if session verification fails
  }
}


// Show Dashboard
async function showDashboard() {
  toggleSection('dashboard'); // Show the dashboard section
  const navBar = document.querySelector('nav');
  if (navBar) {
    navBar.style.display = 'flex'; // Ensure nav bar is displayed
  }

  if (!userId) {
    console.warn('User ID is missing. Cannot load dashboard.');
    return;
  }

  try {
    const response = await fetch(`/api/get-target?userId=${userId}`);
    if (response.ok) {
      const { dailyTarget } = await response.json();
      updateDailyTargetDisplay(dailyTarget || 0);
    } else {
      console.error('Failed to fetch daily target.');
    }
    loadMeals();
    calculateCaloriesLeft();
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}




async function addMeal() {
  const name = document.getElementById('meal-name').value;
  const calories = parseInt(document.getElementById('meal-calories').value, 10);

  if (!name || isNaN(calories) || calories <= 0) {
    alert('Please enter a valid meal name and calorie count.');
    return;
  }

  try {
    const response = await fetch('/api/add-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, meal: { name, calories, date: new Date() } }),
    });

    if (response.ok) {
      console.log('Meal added successfully!');
      loadMeals(); // Reload the meals list
      calculateCaloriesLeft(); // Recalculate calories left
      document.getElementById('meal-name').value = '';
      document.getElementById('meal-calories').value = '';
    } else {
      alert('Error adding meal. Please try again.');
    }
  } catch (err) {
    console.error('Error adding meal:', err);
  }
}

function renderMeals(meals) {
  const mealsList = document.getElementById('meals-list');
  mealsList.innerHTML = ''; // Clear the existing list

  meals.forEach((meal) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

    listItem.innerHTML = `
      <span>${meal.name} - ${meal.calories} calories</span>
      <button class="btn btn-danger btn-sm" onclick="deleteMeal(${meal.id})">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;

    mealsList.appendChild(listItem);
  });
}

async function deleteMeal(mealId) {
  try {
    const response = await fetch(`/api/delete-meal`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealId }),
    });

    if (response.ok) {
      console.log('Meal deleted successfully!');
      loadMeals(); // Reload the meals list
      calculateCaloriesLeft(); // Recalculate calories left
    } else {
      alert('Error deleting meal. Please try again.');
    }
  } catch (err) {
    console.error('Error deleting meal:', err);
  }
}

// Render Common Meals list
function renderCommonMeals() {
  const commonMealsList = document.getElementById('common-meals-list');
  commonMealsList.innerHTML = ''; // Clear the list

  commonMeals.forEach((meal, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

    listItem.innerHTML = `
      <span>${meal.name} - ${meal.calories} calories</span>
      <div>
        <button class="btn btn-primary btn-sm mr-2" onclick="addMealFromCommon(${index})">
          <i class="fas fa-plus"></i> Add
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCommonMeal(${meal.id})">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </div>
    `;

    commonMealsList.appendChild(listItem);
  });

  if (commonMeals.length === 0) {
    commonMealsList.innerHTML = '<li class="list-group-item text-center">No common meals added yet.</li>';
  }
}

async function deleteCommonMeal(mealId) {
  try {
    const response = await fetch(`/api/common-meals/${mealId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.error('Error deleting common meal:', response.statusText);
      alert('Failed to delete common meal.');
      return;
    }

    // Remove the meal from the local commonMeals array
    commonMeals = commonMeals.filter(meal => meal.id !== mealId);

    // Re-render the common meals
    renderCommonMeals();

    console.log('Common meal deleted successfully.');
  } catch (err) {
    console.error('Error deleting common meal:', err);
    alert('Error deleting common meal.');
  }
}


// Add a meal from the Common Meals section
async function addCommonMeal() {
  const name = document.getElementById('common-meal-name').value;
  const calories = parseInt(document.getElementById('common-meal-calories').value, 10);

  if (!name || isNaN(calories) || calories <= 0) {
    alert('Please enter valid meal details.');
    return;
  }

  try {
    const response = await fetch('/api/common-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, meal: { name, calories } }),
    });

    if (response.ok) {
      console.log('Common meal saved successfully!');
      document.getElementById('common-meal-name').value = '';
      document.getElementById('common-meal-calories').value = '';
      loadCommonMeals(); // Refresh the Common Meals list
    } else {
      alert('Error saving common meal. Please try again.');
    }
  } catch (err) {
    console.error('Error saving common meal:', err);
  }
}

async function addMealFromCommon(index) {
  const meal = commonMeals[index];

  if (!meal) {
    console.error(`Meal not found at index: ${index}`);
    return;
  }

  try {
    const response = await fetch('/api/add-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, meal: { name: meal.name, calories: meal.calories, date: new Date() } }),
    });

    if (response.ok) {
      console.log('Meal added successfully!');
      loadMeals(); // Refresh the Meals list
      calculateCaloriesLeft(); // Update Calories Left
    } else {
      alert('Error adding meal. Please try again.');
    }
  } catch (err) {
    console.error('Error adding meal:', err);
  }
}


async function loadCommonMeals() {
  try {
    const response = await fetch(`/api/common-meals?userId=${userId}`);
    if (!response.ok) {
      console.error('Error fetching common meals:', response.statusText);
      return;
    }

    commonMeals = await response.json();
    renderCommonMeals(); // Refresh the Common Meals list
  } catch (err) {
    console.error('Error fetching common meals:', err);
  }
}

function toggleCommonMeals() {
  const container = document.getElementById('common-meals-container');
  const toggleText = document.getElementById('toggle-text');
  if (container.style.display === 'none') {
    container.style.display = 'block';
    toggleText.textContent = 'Hide';
  } else {
    container.style.display = 'none';
    toggleText.textContent = 'Show';
  }
}

function navigateTo(section) {
  alert(`Navigating to ${section} (This feature is not yet implemented).`);
}

function logout(event) {
  event.preventDefault();
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  userId = null; // Reset the userId
  const navBar = document.querySelector('nav');
  if (navBar) {
    navBar.style.display = 'none'; // Hide the nav bar
  }
  toggleSection('login'); // Redirect to login
}





// Wait for the DOM to fully load before running these initializations
document.addEventListener('DOMContentLoaded', async () => {
  const navBar = document.querySelector('nav');
  
  // Hide the nav bar by default
  if (navBar) {
    navBar.style.display = 'none';
  }

  try {
    await checkSession(); // Ensure the user is logged in and set userId

    if (userId) {
      // If user is logged in, load data and show navigation bar
      navBar.style.display = 'flex';
      await loadCommonMeals();
      await loadMeals();
      await calculateCaloriesLeft();
    }
  } catch (err) {
    console.error('Error during initialization:', err);
  }
});


