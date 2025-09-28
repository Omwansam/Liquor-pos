import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Sample data for demonstration
const sampleProducts = [
  {
    id: 1,
    name: 'Johnnie Walker Black Label',
    category: 'whiskey',
    barcode: '5013965714119',
    price: 4500,
    cost: 3000,
    stock: 25,
    image: '/api/placeholder/200/200',
    description: 'Premium blended Scotch whisky',
    status: 'In Stock'
  },
  {
    id: 2,
    name: 'Absolut Vodka',
    category: 'vodka',
    barcode: '7312040017039',
    price: 3200,
    cost: 2000,
    stock: 15,
    image: '/api/placeholder/200/200',
    description: 'Premium Swedish vodka',
    status: 'In Stock'
  },
  {
    id: 3,
    name: 'Bombay Sapphire Gin',
    category: 'gin',
    barcode: '5010677714007',
    price: 2800,
    cost: 1800,
    stock: 8,
    image: '/api/placeholder/200/200',
    description: 'Premium London dry gin',
    status: 'Low Stock'
  },
  {
    id: 4,
    name: 'Bacardi Superior Rum',
    category: 'rum',
    barcode: '5010677024007',
    price: 2200,
    cost: 1400,
    stock: 0,
    image: '/api/placeholder/200/200',
    description: 'White rum from Puerto Rico',
    status: 'Out of Stock'
  },
  {
    id: 5,
    name: 'Dom Pérignon Champagne',
    category: 'champagne',
    barcode: '3185370660108',
    price: 25000,
    cost: 18000,
    stock: 3,
    image: '/api/placeholder/200/200',
    description: 'Luxury French champagne',
    status: 'In Stock'
  },
  {
    id: 6,
    name: 'Tusker Lager',
    category: 'beer',
    barcode: '6161100240015',
    price: 150,
    cost: 90,
    stock: 200,
    image: '/api/placeholder/200/200',
    description: 'Kenyan premium lager',
    status: 'In Stock'
  },
  {
    id: 7,
    name: 'Jameson Irish Whiskey',
    category: 'whiskey',
    barcode: '5011007003002',
    price: 3200,
    cost: 2100,
    stock: 35,
    image: '/api/placeholder/200/200',
    description: 'Smooth triple-distilled Irish whiskey',
    status: 'In Stock'
  },
  {
    id: 8,
    name: 'Glenfiddich 12 Year',
    category: 'whiskey',
    barcode: '5010327325127',
    price: 6500,
    cost: 4800,
    stock: 12,
    image: '/api/placeholder/200/200',
    description: 'Single malt Scotch with fruity notes',
    status: 'In Stock'
  },
  {
    id: 9,
    name: 'Smirnoff Red Vodka',
    category: 'vodka',
    barcode: '5410316991461',
    price: 1700,
    cost: 1100,
    stock: 48,
    image: '/api/placeholder/200/200',
    description: 'Classic triple-distilled vodka',
    status: 'In Stock'
  },
  {
    id: 10,
    name: 'Grey Goose Vodka',
    category: 'vodka',
    barcode: '5010677852007',
    price: 6000,
    cost: 4300,
    stock: 9,
    image: '/api/placeholder/200/200',
    description: 'Premium French vodka',
    status: 'Low Stock'
  },
  {
    id: 11,
    name: 'Tanqueray London Dry Gin',
    category: 'gin',
    barcode: '5000289921007',
    price: 2700,
    cost: 1800,
    stock: 22,
    image: '/api/placeholder/200/200',
    description: 'Balanced botanicals and juniper',
    status: 'In Stock'
  },
  {
    id: 12,
    name: 'Beefeater Gin',
    category: 'gin',
    barcode: '5000299601001',
    price: 2400,
    cost: 1600,
    stock: 6,
    image: '/api/placeholder/200/200',
    description: 'London dry gin with bold juniper',
    status: 'Low Stock'
  },
  {
    id: 13,
    name: 'Captain Morgan Spiced Rum',
    category: 'rum',
    barcode: '08700000705',
    price: 2100,
    cost: 1400,
    stock: 18,
    image: '/api/placeholder/200/200',
    description: 'Spiced Caribbean rum',
    status: 'In Stock'
  },
  {
    id: 14,
    name: 'Patrón Silver Tequila',
    category: 'tequila',
    barcode: '721733000039',
    price: 8000,
    cost: 6000,
    stock: 5,
    image: '/api/placeholder/200/200',
    description: 'Ultra-premium 100% agave tequila',
    status: 'Low Stock'
  },
  {
    id: 15,
    name: 'Moët & Chandon Brut',
    category: 'champagne',
    barcode: '3185370000038',
    price: 11000,
    cost: 8200,
    stock: 7,
    image: '/api/placeholder/200/200',
    description: 'Iconic French champagne',
    status: 'Low Stock'
  },
  {
    id: 16,
    name: 'Campo Viejo Rioja Tempranillo',
    category: 'wine',
    barcode: '8410302106120',
    price: 1900,
    cost: 1200,
    stock: 28,
    image: '/api/placeholder/200/200',
    description: 'Spanish red wine with ripe fruit',
    status: 'In Stock'
  },
  {
    id: 17,
    name: 'Jacob’s Creek Chardonnay',
    category: 'wine',
    barcode: '9311043085209',
    price: 1600,
    cost: 1000,
    stock: 30,
    image: '/api/placeholder/200/200',
    description: 'Australian white wine, crisp and fresh',
    status: 'In Stock'
  },
  {
    id: 18,
    name: 'Heineken Lager 330ml',
    category: 'beer',
    barcode: '8712000059679',
    price: 230,
    cost: 140,
    stock: 180,
    image: '/api/placeholder/200/200',
    description: 'International premium beer',
    status: 'In Stock'
  },
  {
    id: 19,
    name: 'Guinness Stout 500ml',
    category: 'beer',
    barcode: '5099873022115',
    price: 280,
    cost: 170,
    stock: 95,
    image: '/api/placeholder/200/200',
    description: 'Rich and creamy stout',
    status: 'In Stock'
  },
  {
    id: 20,
    name: 'Hennessy VS Cognac',
    category: 'cognac',
    barcode: '3245990250206',
    price: 9000,
    cost: 6800,
    stock: 8,
    image: '/api/placeholder/200/200',
    description: 'Classic VS Cognac',
    status: 'Low Stock'
  },
  // Additional products per category
  {
    id: 21,
    name: 'Jack Daniel\'s Old No. 7',
    category: 'whiskey',
    barcode: '5099873042212',
    price: 3000,
    cost: 2100,
    stock: 40,
    image: '/api/placeholder/200/200',
    description: 'Tennessee whiskey with smooth character',
    status: 'In Stock'
  },
  {
    id: 22,
    name: 'Chivas Regal 12 Year',
    category: 'whiskey',
    barcode: '5000299225001',
    price: 5200,
    cost: 3800,
    stock: 14,
    image: '/api/placeholder/200/200',
    description: 'Blended Scotch, rich and generous',
    status: 'In Stock'
  },
  {
    id: 23,
    name: 'Ketel One Vodka',
    category: 'vodka',
    barcode: '8710625402200',
    price: 4200,
    cost: 3000,
    stock: 16,
    image: '/api/placeholder/200/200',
    description: 'Crisp and sophisticated Dutch vodka',
    status: 'In Stock'
  },
  {
    id: 24,
    name: 'Belvedere Vodka',
    category: 'vodka',
    barcode: '5900471001287',
    price: 6500,
    cost: 4700,
    stock: 7,
    image: '/api/placeholder/200/200',
    description: 'Premium Polish rye vodka',
    status: 'Low Stock'
  },
  {
    id: 25,
    name: 'Hendrick\'s Gin',
    category: 'gin',
    barcode: '5010327755016',
    price: 5200,
    cost: 3900,
    stock: 11,
    image: '/api/placeholder/200/200',
    description: 'Gin infused with cucumber and rose',
    status: 'In Stock'
  },
  {
    id: 26,
    name: 'Gordon\'s London Dry Gin',
    category: 'gin',
    barcode: '5000289111125',
    price: 1800,
    cost: 1200,
    stock: 32,
    image: '/api/placeholder/200/200',
    description: 'Classic London dry gin since 1769',
    status: 'In Stock'
  },
  {
    id: 27,
    name: 'Havana Club 7 Años',
    category: 'rum',
    barcode: '8501110080535',
    price: 3400,
    cost: 2400,
    stock: 13,
    image: '/api/placeholder/200/200',
    description: 'Cuban dark rum aged 7 years',
    status: 'In Stock'
  },
  {
    id: 28,
    name: 'Malibu Coconut Rum',
    category: 'rum',
    barcode: '089540448027',
    price: 2100,
    cost: 1500,
    stock: 26,
    image: '/api/placeholder/200/200',
    description: 'Caribbean rum with coconut liqueur',
    status: 'In Stock'
  },
  {
    id: 29,
    name: 'Jose Cuervo Especial Gold',
    category: 'tequila',
    barcode: '811538017307',
    price: 3800,
    cost: 2700,
    stock: 19,
    image: '/api/placeholder/200/200',
    description: 'Blend of reposado and joven tequilas',
    status: 'In Stock'
  },
  {
    id: 30,
    name: 'Don Julio Blanco',
    category: 'tequila',
    barcode: '674545000035',
    price: 9500,
    cost: 7200,
    stock: 6,
    image: '/api/placeholder/200/200',
    description: 'Premium unaged 100% blue agave',
    status: 'Low Stock'
  },
  {
    id: 31,
    name: 'Veuve Clicquot Yellow Label',
    category: 'champagne',
    barcode: '3049610004121',
    price: 12500,
    cost: 9400,
    stock: 8,
    image: '/api/placeholder/200/200',
    description: 'Iconic brut champagne',
    status: 'Low Stock'
  },
  {
    id: 32,
    name: 'Laurent-Perrier La Cuvée',
    category: 'champagne',
    barcode: '3258434300003',
    price: 12000,
    cost: 9000,
    stock: 10,
    image: '/api/placeholder/200/200',
    description: 'Elegant and fresh brut champagne',
    status: 'Low Stock'
  },
  {
    id: 33,
    name: 'Barefoot Merlot',
    category: 'wine',
    barcode: '085000021304',
    price: 1400,
    cost: 900,
    stock: 42,
    image: '/api/placeholder/200/200',
    description: 'California merlot with soft tannins',
    status: 'In Stock'
  },
  {
    id: 34,
    name: 'Oyster Bay Sauvignon Blanc',
    category: 'wine',
    barcode: '9415549800983',
    price: 2100,
    cost: 1400,
    stock: 24,
    image: '/api/placeholder/200/200',
    description: 'New Zealand crisp white wine',
    status: 'In Stock'
  },
  {
    id: 35,
    name: 'Budweiser 355ml',
    category: 'beer',
    barcode: '018200105406',
    price: 200,
    cost: 120,
    stock: 220,
    image: '/api/placeholder/200/200',
    description: 'American lager beer',
    status: 'In Stock'
  },
  {
    id: 36,
    name: 'Corona Extra 355ml',
    category: 'beer',
    barcode: '071990010023',
    price: 240,
    cost: 150,
    stock: 160,
    image: '/api/placeholder/200/200',
    description: 'Mexican pale lager',
    status: 'In Stock'
  },
  {
    id: 37,
    name: 'Courvoisier VS',
    category: 'cognac',
    barcode: '3049197210203',
    price: 8500,
    cost: 6300,
    stock: 9,
    image: '/api/placeholder/200/200',
    description: 'Balanced and elegant VS cognac',
    status: 'Low Stock'
  },
  {
    id: 38,
    name: 'Rémy Martin VSOP',
    category: 'cognac',
    barcode: '3024480006852',
    price: 14000,
    cost: 10800,
    stock: 5,
    image: '/api/placeholder/200/200',
    description: 'Fine Champagne Cognac, VSOP',
    status: 'Low Stock'
  }
];

const sampleCustomers = [
  {
    id: 1,
    name: 'James Kariuki',
    email: 'james@email.com',
    phone: '+254712345678',
    category: 'VIP',
    totalPurchases: 125000,
    lastPurchase: '2024-01-15'
  },
  {
    id: 2,
    name: 'Grace Wanjiku',
    email: 'grace@email.com',
    phone: '+254723456789',
    category: 'Regular',
    totalPurchases: 45000,
    lastPurchase: '2024-01-14'
  },
  {
    id: 3,
    name: 'Peter Mwangi',
    email: 'peter@email.com',
    phone: '+254734567890',
    category: 'New',
    totalPurchases: 8500,
    lastPurchase: '2024-01-13'
  }
];

const sampleSales = [
  {
    id: 1,
    customerId: 1,
    employeeId: 1,
    items: [
      { productId: 1, quantity: 2, price: 4500 },
      { productId: 2, quantity: 1, price: 3200 }
    ],
    total: 12200,
    paymentMethod: 'Card',
    date: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    customerId: 2,
    employeeId: 2,
    items: [
      { productId: 6, quantity: 12, price: 150 }
    ],
    total: 1800,
    paymentMethod: 'Cash',
    date: '2024-01-14T15:45:00Z'
  }
];

export const AppProvider = ({ children }) => {
  const [products, setProducts] = useState(sampleProducts);
  const [customers, setCustomers] = useState(sampleCustomers);
  const [sales, setSales] = useState(sampleSales);
  const [employees, setEmployees] = useState([
    { id: 1, name: 'John Mwangi', username: 'john', role: 'employee', email: 'john@liquorstore.com' },
    { id: 2, name: 'Mary Wanjiku', username: 'mary', role: 'employee', email: 'mary@liquorstore.com' }
  ]);

  const addProduct = (product) => {
    const newProduct = {
      ...product,
      id: Date.now(),
      status: product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'
    };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id, updates) => {
    setProducts(products.map(product => 
      product.id === id 
        ? { 
            ...product, 
            ...updates, 
            status: updates.stock > 10 ? 'In Stock' : updates.stock > 0 ? 'Low Stock' : 'Out of Stock'
          }
        : product
    ));
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const addCustomer = (customer) => {
    const newCustomer = { ...customer, id: Date.now() };
    setCustomers([...customers, newCustomer]);
  };

  const updateCustomer = (id, updates) => {
    setCustomers(customers.map(customer => 
      customer.id === id ? { ...customer, ...updates } : customer
    ));
  };

  const addSale = (sale) => {
    const newSale = { ...sale, id: Date.now() };
    setSales([newSale, ...sales]);
    
    // Update product stock
    sale.items.forEach(item => {
      updateProduct(item.productId, {
        stock: products.find(p => p.id === item.productId).stock - item.quantity
      });
    });
  };

  const addEmployee = (employee) => {
    const newEmployee = { ...employee, id: Date.now() };
    setEmployees([...employees, newEmployee]);
  };

  const updateEmployee = (id, updates) => {
    setEmployees(employees.map(employee => 
      employee.id === id ? { ...employee, ...updates } : employee
    ));
  };

  const value = {
    products,
    customers,
    sales,
    employees,
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    addSale,
    addEmployee,
    updateEmployee
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
