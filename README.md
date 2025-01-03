# Weight and Calorie Tracker

## Overview
The Weight and Calorie Tracker application is a simple, user-friendly web app designed to help individuals monitor their weight and calorie intake over time. By providing tools to log data and visualize trends, built initially so I could keep track of my own calorie intake and weight loss... I decided to expand the access of this out to GitHub in case anybody wants to use something similar. Currently the 'production' environment for this is located at https://wt.jahu.uk.

## Features
- **Weight Tracker**: Log and view weight entries over time.
- **Calorie History**: Keep a history of daily calorie intake.
- **Dynamic Charts**: Visualize trends in weight and calorie data through interactive charts.
- **Responsive Design**: Accessible and optimized for both desktop and mobile devices.
- **Collapsible Lists**: Easily view or hide weight history entries for better navigation.

## Technologies Used
- **Node.js**: Backend runtime for efficient server-side processing.
- **JavaScript**: Core programming language for frontend and backend functionality.
- **HTML/CSS**: For structuring and styling the application.
- **Chart.js (or similar library)**: To create dynamic and interactive visualizations.

## Why This App Was Created
This application was developed to:
1. **Simplify Health Tracking**: I just wanted a place to track my weight and calorie in take. I didn't care about barcode scanning, curated lists or whatever. I am under the impression a tool like this likely already exists, but wanted to do something I was personally invested in as it'd mean me I'd more than likely stick to my new positive health routine.
2. **Promote Health Awareness**: Tracking trends over time can motivate users to make informed decisions about their health.
3. **Learn and Experiment**: It cannot be stated enough though, this project is primarily an exploration of software and web development practices. This is all new to me so I wanted to have a small project that I could work on to busy myself in my spare time.

## How to Run the Application
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Future Enhancements
- Adding authentication for secure and personalized tracking.
- Integrating additional health metrics like water intake or sleep tracking.
- Exporting data for offline analysis.
- Improving data input methods for a smoother user experience.

## License
This project is licensed under the [MIT License](LICENSE).

---

## Future Structure of Code

I'm well aware at the moment that it's a complete mess in the scripts.js file. The dream is to use better development practices to rehash everything. When I get to version 1.0.0 of the app then I'll take that work on, I think. The structure I've currently got laid out is below:

# Project File Structure

This document outlines the ideal file structure for the web application, ensuring modularity, scalability, and maintainability.

## File Structure

```
project-root/
├── src/
│   ├── controllers/           # Handles app logic (e.g., addMeal, loadMeals)
│   │   ├── mealController.js
│   │   └── userController.js
│   ├── models/                # Defines data models and database interactions
│   │   ├── mealModel.js
│   │   └── userModel.js
│   ├── routes/                # API route definitions
│   │   ├── mealRoutes.js
│   │   └── userRoutes.js
│   ├── services/              # Business logic and utilities (e.g., calculations)
│   │   └── calorieService.js
│   ├── middleware/            # Middleware for authentication, logging, etc.
│   │   └── authMiddleware.js
│   ├── config/                # Configuration files (e.g., database, environment)
│   │   └── dbConfig.js
│   ├── utils/                 # Helper functions (e.g., date formatting)
│   │   └── dateUtils.js
│   ├── app.js                 # Main application logic (Express initialization)
│   └── server.js              # Entry point for starting the server
├── public/                    # Static files (CSS, images, etc.)
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── scripts.js
│   └── index.html             # Main HTML file
├── tests/                     # Unit and integration tests
│   ├── controllers/
│   ├── models/
│   └── routes/
├── .env                       # Environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Node.js dependencies and scripts
└── README.md                  # Project documentation
```

---

Thank you for checking out the Weight and Calorie Tracker! Contributions and feedback are always welcome.
