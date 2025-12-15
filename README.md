# 💰 ARTHI: Microloan Request & Approval Management Platform

## 🔗 Live Site

**Simplifying microloans. Empowering borrowers. Streamlining approvals.**

[https://arthi-e965b.web.app/]

---

## ✨ Project Overview

**ARTHI** is a modern, full-stack **Microloan Management Platform** designed to digitize and simplify the entire loan lifecycle—from loan discovery and application to approval and fee payment.

Built for **microfinance institutions, NGOs, and small lenders**, ARTHI brings **borrowers, loan officers (managers), and admins** into one secure, transparent system.  
The platform replaces scattered spreadsheets and manual workflows with a **role-based, real-time loan tracking solution**.

---

## 🚀 Core Features & System Highlights

ARTHI is implemented as a **responsive Single-Page Application (SPA)** using a scalable MERN-based architecture with secure authentication and payment integration.

### 🔐 Secure Role-Based Authentication
- Email & Password authentication using **Firebase**
- Social login (Google)
- JWT-based authorization with cookies
- Fully protected private routes (reload-safe)
- Environment-variable secured credentials

---

### 🏠 Public Loan Discovery Experience
- Animated landing page with **Framer Motion**
- MongoDB-powered loan listings
- Loan categories, interest rates & EMI plans
- Dynamic loan details pages
- Dark / Light theme toggle

---

### 👤 Borrower (User) Capabilities
- Apply for microloans via a guided application form
- Auto-filled secure user data (email, interest rate)
- Track loan status (Pending / Approved / Rejected)
- Cancel pending applications
- Pay application fee via Stripe**
- View payment receipt & transaction details
- Dedicated **My Loans** dashboard

---

### 🧑‍💼 Manager (Loan Officer) Workflow
- Add and manage loan products
- Update loan details, EMI plans & documents
- Review pending loan applications
- Approve or reject loan requests
- Automatic approval timestamps
- View approved loans
- Personal profile management

---

### 🛠️ Admin-Level System Control
- Manage all users (borrowers & managers)
- Approve, suspend users with **reason & feedback**
- Manage all loans in the system
- Toggle which loans appear on the Home page
- View and filter all loan applications
- Centralized administrative dashboard

---

### 💳 Stripe Payment Integration
- Secure Stripe checkout redirection
- Automatic fee status update (Unpaid → Paid)
- Paid badge with payment details modal
- Transaction ID, email & loan reference tracking

---

## 📊 Dashboard & UI Experience
- Fully responsive dashboard layout
- Consistent color theme & spacing
- Role-based navigation
- Reusable modals & components
- Loading spinners for API calls
- Toast & SweetAlert notifications
- Custom 404 page
- Dynamic page titles per route

---

## 🛠️ Technology Stack

ARTHI is built using a modern, scalable, and production-ready technology stack focused on performance, security, and clean user experience.

| Category                  | Technology                | Purpose                                 |
| :------------------------ | :------------------------ | :-------------------------------------- |
| **Frontend Framework**    | React 19                  | Component-based Single Page Application |
| **Routing**               | React Router              | Client-side routing & private routes    |
| **State & Data Fetching** | TanStack React Query      | Server-state management & caching       |
| **Styling**               | Tailwind CSS & DaisyUI    | Responsive UI & reusable components     |
| **UI Components**         | Headless UI               | Accessible UI primitives                |
| **Animations**            | Framer Motion             | Smooth UI transitions                   |
| **Charts & Visuals**      | Chart.js                  | Dashboard data visualization            |
| **Authentication**        | Firebase                  | Secure login & role-based access        |
| **Backend**               | Node.js & Express.js      | RESTful API                             |
| **Database**              | MongoDB                   | Loan, user & payment data storage       |
| **Payments**              | Stripe                    | Loan application fee processing         |
| **Hosting**               | Firebase & Vercel  | Production deployment                   |

---

## 📦 Notable NPM Packages

### Client-Side Packages

Used to enhance UI, performance, animations, and user experience:

* `@tanstack/react-query` – Efficient API data fetching & caching
* `axios` – HTTP client for backend communication
* `react-router` – Client-side routing
* `react-hook-form` – Form handling & validation
* `tailwindcss` & `daisyui` – Utility-first styling and UI components
* `@headlessui/react` – Accessible UI elements
* `framer-motion` – UI animations
* `swiper` – Responsive sliders & carousels
* `chart.js` – Dashboard charts & graphs
* `lottie-react` – Lottie animations
* `react-fast-marquee` – Scrolling announcements
* `react-hot-toast` – Lightweight toast notifications
* `sweetalert2` – Confirmation & alert modals
* `react-spinners` – Loading indicators
* `react-confetti` – Success celebration effects
* `react-icons` – Icon library
* `styled-components` – Component-level styling
* `react-to-print` – Print or export dashboard data

---

### Server-Side Packages

Powering backend logic, security, and payment processing:

* `express` – Backend framework
* `cors` – Cross-origin request handling
* `dotenv` – Environment variable management
* `firebase-admin` – Server-side Firebase verification
* `mongodb` – MongoDB database driver
* `stripe` – Secure payment processing

---

## 👨‍💻 Project Structure (GitHub Repositories)

| Repository | Description | Status |
| :--- | :--- | :--- |
| **Client-Side** | Contains the React application code. | [https://github.com/SohanKhanDev/arthi-client] |
| **Server-Side** | Contains the Node.js/Express.js API code. | [https://github.com/SohanKhanDev/arthi-server] |