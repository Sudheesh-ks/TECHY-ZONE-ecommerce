# 🛒 TECHY-ZONE

TECHY-ZONE is a full-stack e-commerce platform designed for buying and selling electronic gadgets. It offers a seamless shopping experience with secure authentication, product browsing, cart management, coupon support, online payments, and an intuitive admin dashboard for managing products, orders, and users.

---

## 🚀 Features

### 👤 User Features
- 🔐 Secure User Authentication using JWT
- 🛍️ Browse Products by Categories
- 🔎 Search and Filter Products
- ❤️ Wishlist Management
- 🛒 Shopping Cart
- 🎟️ Coupon & Discount Support
- 💳 Secure Online Payments with Razorpay
- 📦 Order Placement & Order History
- 📍 Address Management
- ⭐ Product Reviews & Ratings
- 📧 Email Notifications for Registration and Orders

### 🛠️ Admin Features
- 📦 Product Management (CRUD)
- 🏷️ Category & Brand Management
- 👥 User Management
- 📑 Order Management
- 🎟️ Coupon Management
- 📊 Sales Dashboard
- 📈 Inventory Management

---

## 🧰 Tech Stack

### Frontend
- EJS
- Bootstrap
- JavaScript
- HTML5
- CSS3
- Axios

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Passport.js (Google Authentication)
- Razorpay Payment Gateway
- Nodemailer
- Multer
- Cloudinary
- Express Session
- Bcrypt

---

## 🏗️ Architecture Overview

The backend follows the **MVC (Model-View-Controller)** architecture for better organization and maintainability.

- **Models** – Define MongoDB schemas.
- **Controllers** – Handle business requests and responses.
- **Routes** – Manage application endpoints.
- **Middlewares** – Authentication, validation, and authorization.
- **Views** – Dynamic EJS templates for rendering pages.

This structure makes the application scalable, maintainable, and easy to extend.

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Sudheesh-ks/TECHY-ZONE-ecommerce.git
cd TECHY-ZONE-ecommerce
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=3000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

SESSION_SECRET=your_session_secret

EMAIL_USER=your_email

EMAIL_PASS=your_email_password

GOOGLE_CLIENT_ID=your_google_client_id

GOOGLE_CLIENT_SECRET=your_google_client_secret

GOOGLE_CALLBACK_URL=your_callback_url

RAZORPAY_KEY_ID=your_razorpay_key

RAZORPAY_KEY_SECRET=your_razorpay_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name

CLOUDINARY_API_KEY=your_api_key

CLOUDINARY_API_SECRET=your_api_secret
```

---

### 4. Run the Application

```bash
npm start
```

or

```bash
npm run dev
```

---

## 📁 Project Structure

```
TECHY-ZONE-ecommerce
│
├── config
├── controllers
├── middleware
├── models
├── public
│   ├── css
│   ├── js
│   └── images
├── routes
├── utils
├── views
│   ├── user
│   └── admin
├── app.js
└── README.md
```

---

## 💳 Payment Integration

- Razorpay Payment Gateway
- Cash on Delivery (COD)
- Coupon-based Discounts

---

## 📦 Core Modules

- User Authentication
- Product Catalog
- Category Management
- Shopping Cart
- Wishlist
- Checkout
- Order Management
- Coupon System
- Payment Integration
- Admin Dashboard
- Inventory Management

---
