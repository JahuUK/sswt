let userId = null;

// Utility function to toggle visibility of sections
function toggleSection(sectionToShow) {
  const sections = ['login', 'register', 'recover-password', 'dashboard'];
  sections.forEach(section => {
    const element = document.getElementById(section);
    if (element) {
      element.style.display = section === sectionToShow ? 'block' : 'none';
    }
  });
}

// Register a new user
async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const securityQuestion = document.getElementById('security-question').value;
  const securityAnswer = document.getElementById('security-answer').value;

  if (!securityQuestion) {
    alert('Please select a security question.');
    return;
  }

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

// Login user
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
      if (rememberMe) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
      userId = data.userId;
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

// Password recovery
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

// Set daily target
async function setTarget() {
  const dailyTarget = document.getElementById('daily-target').value;

  if (!dailyTarget || dailyTarget <= 0) {
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
      console.log(`Daily target successfully set to ${dailyTarget}`);
      updateDailyTargetDisplay(dailyTarget);
    } else {
      console.error('Error setting daily target.');
      alert('Failed to set daily target. Please try again.');
    }
  } catch (err) {
    console.error('Error setting daily target:', err);
  }
}

// Add a new meal
async function addMeal() {
  const name = document.getElementById('meal-name').value;
  const calories = document.getElementById('meal-calories').value;

  if (!name || !calories || calories <= 0) {
    alert('Please provide valid meal details.');
    return;
  }

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

// Load meals
async function loadMeals() {
  try {
    const response = await fetch(`/api/meals?userId=${userId}`);
    const meals = await response.json();

    const mealsList = document.getElementById('meals-list');
    mealsList.innerHTML = '';

    meals.forEach(meal => {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

      // Format timestamp
      const timestamp = new Date(meal.timestamp).toLocaleString();

      li.innerHTML = `
        <div>
          <span>${meal.name} - ${meal.calories} calories</span>
          <small class="text-muted d-block">${timestamp}</small>
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


// Delete a meal
async function deleteMeal(mealId) {
  try {
    const response = await fetch('/api/delete-meal', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealId }),
    });

    if (response.ok) {
      alert('Meal deleted successfully!');
      loadMeals();
      calculateCaloriesLeft();
    } else {
      alert('Error deleting meal. Please try again.');
    }
  } catch (err) {
    console.error('Error deleting meal:', err);
  }
}

// Calculate calories left
async function calculateCaloriesLeft() {
  try {
    const targetResponse = await fetch(`/api/get-target?userId=${userId}`);
    const mealsResponse = await fetch(`/api/meals?userId=${userId}`);

    if (targetResponse.ok && mealsResponse.ok) {
      const targetData = await targetResponse.json();
      const mealsData = await mealsResponse.json();

      const dailyTarget = targetData.dailyTarget || 0;
      const totalCaloriesConsumed = mealsData.reduce(
        (total, meal) => total + parseInt(meal.calories, 10),
        0
      );

      const caloriesLeft = dailyTarget - totalCaloriesConsumed;
      document.getElementById('calories-left-value').textContent = `${caloriesLeft > 0 ? caloriesLeft : 0} calories`;
      document.getElementById('calories-left').style.display = 'block';
    } else {
      console.error('Failed to fetch target or meals.');
    }
  } catch (err) {
    console.error('Error calculating calories left:', err);
  }
}

// Update daily target display
function updateDailyTargetDisplay(dailyTarget) {
  const dailyTargetElement = document.getElementById('daily-target-value');
  if (dailyTargetElement) {
    dailyTargetElement.textContent = `${dailyTarget} calories`;
  }
}

// Check session
function checkSession() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.id;
      showDashboard();
    } catch (err) {
      console.error('Invalid token:', err);
      logout();
    }
  } else {
    toggleSection('login');
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  toggleSection('login');
}

// Show dashboard
async function showDashboard() {
  toggleSection('dashboard'); // Show the dashboard section

  try {
    // Fetch and display the daily target
    const response = await fetch(`/api/get-target?userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      const dailyTarget = data.dailyTarget || 0;
      updateDailyTargetDisplay(dailyTarget);
    } else {
      console.error('Failed to fetch daily target. Response status:', response.status);
    }

    // Load meals and calculate calories left
    loadMeals();
    calculateCaloriesLeft();
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// Ensure the session is checked after DOM is loaded
document.addEventListener('DOMContentLoaded', checkSession);
