let userId = null;
let commonMeals = []; // Array to store common meals


// Utility: Toggle section visibility
function toggleSection(sectionToShow) {
  const sections = [
    'login',
    'register',
    'recover-password',
    'dashboard',
    'weighttracker',
    'calorie-history',
    'about',
  ]; // Added 'about' section to the list
  
  sections.forEach(section => {
    const element = document.getElementById(section);
    if (element) {
      element.style.display = section === sectionToShow ? 'block' : 'none';
    }
  });

  // Ensure the chart is rendered when the weight tracker section is displayed
  if (sectionToShow === 'weighttracker') {
    fetchAndRenderWeightChart();
  }
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
  const dailyTarget = document.getElementById('daily-target-input').value;

  if (!dailyTarget || dailyTarget <= 0) return alert('Please enter a valid daily target.');

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
      alert('Failed to set daily target. Please try again.');
    }
  } catch (err) {
    console.error('Error setting daily target:', err);
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

////////////////////////////////////////////////////////////////////////////////// WEIGHT TRACKING PAGE FUNCTIONALITY

// Log Weight
async function logWeight() {
  const weight = document.getElementById('weight').value;

  if (!weight) {
    alert('Please enter a weight.');
    return;
  }

  try {
    const response = await fetch('/api/weight-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, weight }),
    });

    if (response.ok) {
      console.log('Weight logged successfully!');
      document.getElementById('weight').value = ''; // Clear the input
      fetchWeightHistory(); // Update weight history
      fetchAndRenderWeightChart(); // Update the graph
    } else {
      throw new Error('Failed to log weight');
    }
  } catch (err) {
    console.error('Error logging weight:', err);
    alert('Error logging weight. Please try again.');
  }
}


// Load Weight History
async function loadWeightHistory() {
  try {
    const response = await fetch(`/api/weight-history?userId=${userId}`);
    if (response.ok) {
      const history = await response.json();
      const historyList = document.getElementById('weight-history');
      historyList.innerHTML = ''; // Clear existing history

      history.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.textContent = `${new Date(entry.timestamp).toLocaleString()}: ${entry.weight} kg`;
        historyList.appendChild(listItem);
      });
    } else {
      alert('Failed to fetch weight history.');
    }
  } catch (error) {
    console.error('Error fetching weight history:', error);
  }
}

// Fetch and render weight history
async function fetchWeightHistory() {
  if (!userId) {
    console.error('User ID is null. Unable to fetch weight history.');
    return;
  }

  try {
    const response = await fetch(`/api/weight-history?userId=${userId}`);
    if (!response.ok) {
      console.error('Failed to fetch weight history.');
      return;
    }

    // Correctly store the fetched data
    const history = await response.json();

    const weightHistoryList = document.getElementById('weight-history');
    const wrapper = document.getElementById('weight-history-wrapper');
    
    // Ensure the weight history list is visible after updating
    wrapper.style.display = 'block';
    document.getElementById('toggle-weight-history').textContent = 'Hide Weight History';
    
    weightHistoryList.innerHTML = ''; // Clear previous entries
    

    // Render each weight entry
    history.forEach(entry => {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

      // Format timestamp for the desired output
      const formattedTimestamp = new Date(entry.timestamp).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      li.innerHTML = `
        <div>
          <span>${entry.weight} kg</span>
          <small class="timestamp text-muted">${formattedTimestamp}</small>
        </div>
        <button class="btn btn-danger btn-sm btn-delete" onclick="deleteWeight(${entry.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;

      weightHistoryList.appendChild(li);
    });

    // Ensure CSS styles are applied consistently
    const buttons = document.querySelectorAll('.btn-delete');
    buttons.forEach(button => {
      button.classList.add('btn-danger'); // Ensure the correct style is applied
    });
  } catch (err) {
    console.error('Error fetching weight history:', err);
  }
}

// Toggle Weight History Visibility
document.getElementById('toggle-weight-history').addEventListener('click', () => {
  const wrapper = document.getElementById('weight-history-wrapper');
  const button = document.getElementById('toggle-weight-history');

  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    button.textContent = 'Hide Weight History';
  } else {
    wrapper.style.display = 'none';
    button.textContent = 'Show Weight History';
  }
});


// Delete a weight entry
async function deleteWeight(weightId) {
  if (!weightId) {
    console.error('Weight ID is null. Unable to delete.');
    return;
  }

  try {
    const response = await fetch('/api/delete-weight', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weightId }),
    });

    if (response.ok) {
      console.log('Weight entry deleted successfully.');
      fetchWeightHistory(); // Refresh the weight history list
      fetchAndRenderWeightChart(); // Refresh the chart
    } else {
      console.error('Failed to delete weight entry.');
    }
  } catch (err) {
    console.error('Error deleting weight entry:', err);
  }
}



/////////////////////////////////////////////////////////////////////////////////////////////// CHART FUNCTIONALITY ON WEIGHT TRACKING PAGE

let weightChart;

// Initialize Chart.js
function initializeChart(data = []) {
  const ctx = document.getElementById('weightChart').getContext('2d');
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(entry => new Date(entry.timestamp).toLocaleDateString()), // X-axis labels
      datasets: [
        {
          label: 'Weight (kg)',
          data: data.map(entry => entry.weight), // Y-axis data
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Weight (kg)',
          },
        },
      },
    },
  });
}

// Update the chart with new data
function updateChart(data) {
  weightChart.data.labels = data.map(entry => new Date(entry.timestamp).toLocaleDateString());
  weightChart.data.datasets[0].data = data.map(entry => entry.weight);
  weightChart.update();
}

// Apply Filter Logic
function applyFilter(data, filter) {
  const now = new Date();
  let cutoffDate;

  switch (filter) {
    case '1day':
      cutoffDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case '7days':
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '1month':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case '3months':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case '6months':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case '1year':
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case '2years':
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 2));
      break;
    default: // "all"
      return data;
  }

  return data.filter(entry => new Date(entry.timestamp) >= cutoffDate);
}

// Fetch Weight History and Update Chart
async function fetchAndRenderWeightChart() {
  try {
    const response = await fetch(`/api/weight-history?userId=${userId}`);
    if (!response.ok) {
      console.error('Failed to fetch weight history');
      return;
    }

    const weightHistory = await response.json();

    // Get selected filter
    const filterElement = document.getElementById('time-filter');
    const filter = filterElement ? filterElement.value : 'all';

    // Apply filter to data
    const filteredData = applyFilter(weightHistory, filter);

    // Update Chart
    if (!weightChart) {
      initializeChart(filteredData);
    } else {
      updateChart(filteredData);
    }

    // Update Weight History List
    const historyList = document.getElementById('weight-history');
    historyList.innerHTML = ''; // Clear existing history
    filteredData.forEach(entry => {
      const listItem = document.createElement('li');
      listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

      // Format timestamp
      const formattedTimestamp = new Date(entry.timestamp).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      listItem.innerHTML = `
        <div>
          <span>${entry.weight} kg</span>
          <small class="timestamp text-muted">${formattedTimestamp}</small>
        </div>
        <button class="btn-delete" onclick="deleteWeight(${entry.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;
      historyList.appendChild(listItem);
    });
  } catch (err) {
    console.error('Error fetching weight history:', err);
  }
}

// Event Listener for Filter Change
document.addEventListener('DOMContentLoaded', () => {
  const filterElement = document.getElementById('time-filter');
  if (filterElement) {
    filterElement.addEventListener('change', fetchAndRenderWeightChart);
  }
});

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


