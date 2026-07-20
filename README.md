# Clima — Context-Aware Weather Assistant

Clima is a weather assistant web application that helps users understand weather conditions and make practical daily decisions. The project combines a responsive weather dashboard, real-time weather data, user authentication, and personalized recommendation ideas.

This project is part of my Computer Science portfolio and is being developed step by step as a frontend, UI/UX, and full-stack learning project.

## Project Overview

Most weather applications show weather data, but users still need to interpret what the data means for their daily activities. Clima focuses on presenting weather information in a simple and practical way.

The application allows users to search for a city, view current weather conditions, and receive quick guidance such as what to wear, whether to carry an umbrella, and whether outdoor plans are suitable.

## Current Status

Clima is currently in active development.

Completed or working:
- User registration
- User login
- Logout
- Protected dashboard page
- Weather search by city
- Real-time weather data from OpenWeather API
- Dynamic dashboard values such as temperature, humidity, wind, and weather condition
- Recent searches saved in the browser
- Basic forecast panel connected to API data

In progress:
- Profile page HTML structure
- Sidebar layout for inner application pages
- Profile page CSS styling
- User preferences and profile editing
- Search history modal styling and polish

Planned:
- More complete profile management
- Store user preferences in MySQL
- Improve forecast, alerts, and recommendation logic
- Improve responsive behavior across all pages
- Deploy the application online

## Features

- Responsive landing page
- Signup and login pages
- PHP/MySQL authentication flow
- Protected weather dashboard
- City weather search
- Dynamic current weather display
- Forecast preview panel
- Recent search history
- Personalized recommendation cards
- Profile page structure in development
- Modular CSS and JavaScript organization

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | PHP |
| Database | MySQL |
| API | OpenWeather API |
| Tools | XAMPP, phpMyAdmin, Git, GitHub |
| Design | Figma, Lucide Icons |

## Main Pages

- `index.html` — landing page
- `signup.html` — user registration
- `login.html` — user login
- `app.html` — protected weather dashboard
- `profile.html` — user profile page structure in progress


## Project Structure

clima-weather-app/
├── index.html                  
├── signup.html                 
├── login.html                  
├── app.html                   
├── profile.html                
├── api.php                     
│
├── backend/
│   ├── auth/                   
│   ├── config/
│   ├── helpers/                  
│   └── profile/                
│
├── database/
│   └── clima_app_schema.sql           
│
├── scripts/
│   ├── landing.js              
│   ├── app.js                  
│   ├── auth.js                 
│   ├── recommendation.js       
│   └── clima-pages.js          
│
├── style/
│   ├── main.css                
│   ├── app-pages.css           
│   ├── auth/                   
│   ├── dashboard/              
│   └── profile/                
│
└── assets/
    └── images/                 

The project is organized into separate folders for backend logic, database schema, JavaScript files, reusable styles, and page-specific CSS.

## What I Am Practicing

Through this project, I am improving my skills in:

- Translating Figma designs into responsive web pages
- Building modular CSS components
- Working with JavaScript DOM manipulation
- Fetching and displaying API data
- Creating PHP endpoints that return JSON
- Managing user authentication and sessions
- Connecting a web application to MySQL
- Organizing a project for GitHub and portfolio presentation

## Screenshots

<img width="1920" height="1200" alt="Screenshot 2026-07-20 at 11 20 46" src="https://github.com/user-attachments/assets/62019a8f-7fce-4a2e-9c3c-50b887d79f32" />
<img width="1920" height="1200" alt="Screenshot 2026-07-20 at 11 21 34" src="https://github.com/user-attachments/assets/979b55f1-711b-4dd6-811f-716d5ba1890a" />

Updated screenshots will be added as the dashboard and profile page are polished.


## Future Improvements

- Complete profile page styling
- Add profile editing functionality
- Add user preferences page
- Add forecast detail pages
- Add weather alert detail pages
- Add notification settings
- Save user preferences to MySQL
- Improve daily forecast data display
- Improve mobile responsiveness
- Deploy the application online

## Author

**Estelle Victorine**  
Computer Science student based in Klaipeda, Lithuania  
Interested in Frontend Development, UI/UX Engineering, and Product Design
