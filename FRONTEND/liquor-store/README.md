# Liquor Store POS System

A comprehensive Point of Sale (POS) system designed specifically for liquor stores operating within club environments. Built with React, this system provides both admin and employee interfaces with full functionality for managing sales, inventory, customers, and reporting.

## Features

### 🔐 Authentication & User Roles
- **Employee Login System**: Secure username/password authentication
- **Role-Based Access Control**: Separate admin and employee interfaces
- **Session Management**: Persistent login sessions with logout functionality
- **Demo Credentials**: Pre-configured accounts for testing

### 👨‍💼 Admin Interface
- **Comprehensive Dashboard**: Revenue, sales, product, and customer metrics
- **Product Management**: Add, edit, delete products with categories (whiskey, vodka, gin, rum, tequila, champagne, wine, beer, cognac)
- **Inventory Tracking**: Stock levels with status indicators (In Stock, Low Stock, Out of Stock)
- **Customer Management**: Contact information, purchase history, and categorization (VIP, Regular, New)
- **Employee Management**: Add, edit, and manage staff accounts
- **Sales History**: Complete transaction records with detailed views
- **Advanced Reporting**: Charts, graphs, and business analytics

### 🛒 Employee Interface
- **Streamlined POS Terminal**: Focused on processing transactions
- **Product Catalog**: Search and category filtering
- **Shopping Cart**: Add/remove items with quantity adjustment
- **Multiple Payment Methods**: Cash, Card, M-Pesa support
- **Receipt Generation**: Company details and transaction information
- **Personal Sales History**: Track individual performance

### 📊 Technical Features
- **Responsive Design**: Works on different screen sizes
- **Professional UI**: Tailwind CSS with amber/orange color scheme
- **Error Handling**: Proper loading states and error management
- **Modern Icons**: Lucide React icons throughout
- **Currency Support**: Kenyan Shillings (KSH) formatting

## Demo Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full system access including all management features

### Employee Accounts
- **Username**: `john` | **Password**: `john123`
- **Username**: `mary` | **Password**: `mary123`
- **Access**: POS terminal and personal sales history

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd liquor-store
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── AdminDashboard.jsx      # Main admin interface
│   ├── EmployeePOS.jsx         # POS terminal for employees
│   ├── Login.jsx              # Authentication component
│   ├── LoadingSpinner.jsx     # Loading state component
│   ├── ProductManagement.jsx  # Product CRUD operations
│   ├── CustomerManagement.jsx # Customer management
│   ├── EmployeeManagement.jsx # Staff management
│   ├── SalesHistory.jsx       # Transaction history
│   └── Reports.jsx            # Analytics and reporting
├── contexts/
│   ├── AuthContext.jsx        # Authentication state management
│   └── AppContext.jsx         # Application data management
├── App.jsx                    # Main application component
└── main.jsx                   # Application entry point
```

## Key Components

### Authentication System
- **AuthContext**: Manages user authentication state
- **Protected Routes**: Role-based access control
- **Session Persistence**: LocalStorage for login state

### Data Management
- **AppContext**: Centralized state for products, customers, sales, employees
- **Sample Data**: Pre-loaded with demonstration data
- **Real-time Updates**: State updates across components

### Admin Features
- **Dashboard Overview**: Key metrics and recent activity
- **Product Management**: Full CRUD with inventory tracking
- **Customer Management**: Contact info and purchase history
- **Employee Management**: Staff account administration
- **Sales History**: Detailed transaction records
- **Reports & Analytics**: Charts and business insights

### Employee Features
- **POS Terminal**: Streamlined sales interface
- **Product Search**: Quick product lookup and filtering
- **Shopping Cart**: Intuitive cart management
- **Payment Processing**: Multiple payment method support
- **Receipt Generation**: Professional transaction receipts

## Technology Stack

- **React 19**: Modern React with hooks
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, customizable icons
- **Recharts**: Composable charting library
- **Vite**: Fast build tool and dev server

## Currency & Localization

- **Primary Currency**: Kenyan Shillings (KSH)
- **Number Formatting**: Proper KSH formatting throughout
- **Date Formatting**: Localized date and time display

## Sample Data

The system comes pre-loaded with:
- **6 Sample Products**: Various liquor categories with realistic pricing
- **3 Sample Customers**: Different customer types (VIP, Regular, New)
- **2 Sample Employees**: Admin and employee accounts
- **2 Sample Sales**: Transaction history for demonstration

## Features in Detail

### Product Management
- Add new products with categories, pricing, and stock levels
- Edit existing product information
- Delete products from inventory
- Real-time stock status updates
- Category-based filtering and search

### Customer Management
- Customer database with contact information
- Purchase history tracking
- Customer categorization (VIP, Regular, New)
- Total spending calculations
- Last purchase date tracking

### Sales Processing
- Intuitive product selection interface
- Real-time cart calculations
- Multiple payment method support
- Customer information capture (optional)
- Receipt generation with company branding

### Reporting & Analytics
- Revenue and sales metrics
- Top-selling products analysis
- Employee performance tracking
- Payment method distribution
- Daily sales trends
- Category-wise sales breakdown

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Code Style
- ESLint configuration for code quality
- Consistent component structure
- Proper error handling
- Responsive design patterns

## Future Enhancements

- Barcode scanning integration
- Receipt printing functionality
- Advanced inventory management
- Customer loyalty programs
- Multi-location support
- API integration for real backend

## Support

For questions or issues, please refer to the documentation or contact the development team.

---

**Built with ❤️ for liquor store management**