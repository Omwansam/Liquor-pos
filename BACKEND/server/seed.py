from extensions import db
from models import (
    User, Category, Product, ProductImage, Customer, Sale, SaleItem, 
    InventoryTransaction, Notification, SystemSettings, Supplier, AuditLog,
    UserRole, CustomerCategory, PaymentMethod, TransactionType, NotificationType
)
from datetime import datetime, date, timedelta
from decimal import Decimal
import random

def seed_database():
    """Seed the database with sample data"""
    
    # Clear existing data
    print("Clearing existing data...")
    db.drop_all()
    db.create_all()
    
    # Create categories
    print("Creating categories...")
    categories_data = [
        {'name': 'whiskey', 'description': 'Premium whiskey collection'},
        {'name': 'vodka', 'description': 'Premium vodka selection'},
        {'name': 'gin', 'description': 'London dry and craft gins'},
        {'name': 'rum', 'description': 'Caribbean and spiced rums'},
        {'name': 'tequila', 'description': 'Premium tequilas and mezcals'},
        {'name': 'champagne', 'description': 'French champagnes and sparkling wines'},
        {'name': 'wine', 'description': 'Red and white wines'},
        {'name': 'beer', 'description': 'Local and international beers'},
        {'name': 'cognac', 'description': 'Premium cognacs and brandies'}
    ]
   
    for cat_data in categories_data:
        category = Category(**cat_data)
        db.session.add(category)
    
    db.session.commit()
    
    # Create users
    print("Creating users...")
    users_data = [
        {
            'username': 'admin',
            'email': 'admin@liquorstore.com',
            'name': 'System Administrator',
            'role': UserRole.ADMIN,
            'is_admin': True,
            'phone': '+254700000001'
        },
        {
            'username': 'john',
            'email': 'john@liquorstore.com',
            'name': 'John Mwangi',
            'role': UserRole.EMPLOYEE,
            'is_admin': False,
            'phone': '+254700000002'
        },
        {
            'username': 'mary',
            'email': 'mary@liquorstore.com',
            'name': 'Mary Wanjiku',
            'role': UserRole.EMPLOYEE,
            'is_admin': False,
            'phone': '+254700000003'
        },
        {
            'username': 'manager',
            'email': 'manager@liquorstore.com',
            'name': 'Store Manager',
            'role': UserRole.MANAGER,
            'is_admin': True,
            'phone': '+254700000004'
        }
    ]
    
    for user_data in users_data:
        user = User(**user_data)
        user.set_password('password123')  # Default password for all users
        db.session.add(user)
    
    db.session.commit()
    
    # Create suppliers
    print("Creating suppliers...")
    suppliers_data = [
        {
            'name': 'Diageo Kenya',
            'contact_person': 'James Kariuki',
            'email': 'james@diageo.co.ke',
            'phone': '+254722000001',
            'address': 'Nairobi, Kenya',
            'payment_terms': 'Net 30'
        },
        {
            'name': 'Pernod Ricard',
            'contact_person': 'Grace Wanjiku',
            'email': 'grace@pernodricard.co.ke',
            'phone': '+254722000002',
            'address': 'Mombasa, Kenya',
            'payment_terms': 'Net 45'
        },
        {
            'name': 'East African Breweries',
            'contact_person': 'Peter Mwangi',
            'email': 'peter@eabl.co.ke',
            'phone': '+254722000003',
            'address': 'Nairobi, Kenya',
            'payment_terms': 'Net 15'
        }
    ]
    
    for supplier_data in suppliers_data:
        supplier = Supplier(**supplier_data)
        db.session.add(supplier)
    
    db.session.commit()
    
    # Get categories for foreign key references
    categories = {cat.name: cat for cat in Category.query.all()}
    
    # Create products
    print("Creating products...")
    products_data_raw = [
        # Whiskey
        {
            'name': 'Johnnie Walker Black Label',
            'category': 'whiskey',
            'barcode': '5013965714119',
            'price': 4500.00,
            'cost': 3000.00,
            'stock': 25,
            'min_stock_level': 5,
            'max_stock_level': 50,
            'description': 'Premium blended Scotch whisky',
            'brand': 'Johnnie Walker',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Scotland',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Jameson Irish Whiskey',
            'category': 'whiskey',
            'barcode': '5011007003002',
            'price': 3200.00,
            'cost': 2100.00,
            'stock': 35,
            'min_stock_level': 5,
            'max_stock_level': 50,
            'description': 'Smooth triple-distilled Irish whiskey',
            'brand': 'Jameson',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Ireland',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Glenfiddich 12 Year',
            'category': 'whiskey',
            'barcode': '5010327325127',
            'price': 6500.00,
            'cost': 4800.00,
            'stock': 12,
            'min_stock_level': 3,
            'max_stock_level': 20,
            'description': 'Single malt Scotch with fruity notes',
            'brand': 'Glenfiddich',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Scotland',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Jack Daniel\'s Old No. 7',
            'category': 'whiskey',
            'barcode': '5099873042212',
            'price': 3000.00,
            'cost': 2100.00,
            'stock': 40,
            'min_stock_level': 5,
            'max_stock_level': 60,
            'description': 'Tennessee whiskey with smooth character',
            'brand': 'Jack Daniel\'s',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'USA',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Chivas Regal 12 Year',
            'category': 'whiskey',
            'barcode': '5000299225001',
            'price': 5200.00,
            'cost': 3800.00,
            'stock': 14,
            'min_stock_level': 3,
            'max_stock_level': 25,
            'description': 'Blended Scotch, rich and generous',
            'brand': 'Chivas Regal',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Scotland',
            'supplier': 'Diageo Kenya'
        },
        
        # Vodka
        {
            'name': 'Absolut Vodka',
            'category': 'vodka',
            'barcode': '7312040017039',
            'price': 3200.00,
            'cost': 2000.00,
            'stock': 15,
            'min_stock_level': 5,
            'max_stock_level': 40,
            'description': 'Premium Swedish vodka',
            'brand': 'Absolut',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Sweden',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Smirnoff Red Vodka',
            'category': 'vodka',
            'barcode': '5410316991461',
            'price': 1700.00,
            'cost': 1100.00,
            'stock': 48,
            'min_stock_level': 10,
            'max_stock_level': 80,
            'description': 'Classic triple-distilled vodka',
            'brand': 'Smirnoff',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Russia',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Grey Goose Vodka',
            'category': 'vodka',
            'barcode': '5010677852007',
            'price': 6000.00,
            'cost': 4300.00,
            'stock': 9,
            'min_stock_level': 3,
            'max_stock_level': 20,
            'description': 'Premium French vodka',
            'brand': 'Grey Goose',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Ketel One Vodka',
            'category': 'vodka',
            'barcode': '8710625402200',
            'price': 4200.00,
            'cost': 3000.00,
            'stock': 16,
            'min_stock_level': 5,
            'max_stock_level': 30,
            'description': 'Crisp and sophisticated Dutch vodka',
            'brand': 'Ketel One',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Netherlands',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Belvedere Vodka',
            'category': 'vodka',
            'barcode': '5900471001287',
            'price': 6500.00,
            'cost': 4700.00,
            'stock': 7,
            'min_stock_level': 3,
            'max_stock_level': 15,
            'description': 'Premium Polish rye vodka',
            'brand': 'Belvedere',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Poland',
            'supplier': 'Pernod Ricard'
        },
        
        # Gin
        {
            'name': 'Bombay Sapphire Gin',
            'category': 'gin',
            'barcode': '5010677714007',
            'price': 2800.00,
            'cost': 1800.00,
            'stock': 8,
            'min_stock_level': 3,
            'max_stock_level': 25,
            'description': 'Premium London dry gin',
            'brand': 'Bombay Sapphire',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'England',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Tanqueray London Dry Gin',
            'category': 'gin',
            'barcode': '5000289921007',
            'price': 2700.00,
            'cost': 1800.00,
            'stock': 22,
            'min_stock_level': 5,
            'max_stock_level': 40,
            'description': 'Balanced botanicals and juniper',
            'brand': 'Tanqueray',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'England',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Beefeater Gin',
            'category': 'gin',
            'barcode': '5000299601001',
            'price': 2400.00,
            'cost': 1600.00,
            'stock': 6,
            'min_stock_level': 3,
            'max_stock_level': 20,
            'description': 'London dry gin with bold juniper',
            'brand': 'Beefeater',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'England',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Hendrick\'s Gin',
            'category': 'gin',
            'barcode': '5010327755016',
            'price': 5200.00,
            'cost': 3900.00,
            'stock': 11,
            'min_stock_level': 3,
            'max_stock_level': 20,
            'description': 'Gin infused with cucumber and rose',
            'brand': 'Hendrick\'s',
            'size': '750ml',
            'alcohol_content': 41.4,
            'country_of_origin': 'Scotland',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Gordon\'s London Dry Gin',
            'category': 'gin',
            'barcode': '5000289111125',
            'price': 1800.00,
            'cost': 1200.00,
            'stock': 32,
            'min_stock_level': 10,
            'max_stock_level': 60,
            'description': 'Classic London dry gin since 1769',
            'brand': 'Gordon\'s',
            'size': '750ml',
            'alcohol_content': 37.5,
            'country_of_origin': 'England',
            'supplier': 'Diageo Kenya'
        },
        
        # Rum
        {
            'name': 'Bacardi Superior Rum',
            'category': 'rum',
            'barcode': '5010677024007',
            'price': 2200.00,
            'cost': 1400.00,
            'stock': 0,
            'min_stock_level': 5,
            'max_stock_level': 30,
            'description': 'White rum from Puerto Rico',
            'brand': 'Bacardi',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Puerto Rico',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Captain Morgan Spiced Rum',
            'category': 'rum',
            'barcode': '08700000705',
            'price': 2100.00,
            'cost': 1400.00,
            'stock': 18,
            'min_stock_level': 5,
            'max_stock_level': 35,
            'description': 'Spiced Caribbean rum',
            'brand': 'Captain Morgan',
            'size': '750ml',
            'alcohol_content': 35.0,
            'country_of_origin': 'Jamaica',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Havana Club 7 Años',
            'category': 'rum',
            'barcode': '8501110080535',
            'price': 3400.00,
            'cost': 2400.00,
            'stock': 13,
            'min_stock_level': 3,
            'max_stock_level': 25,
            'description': 'Cuban dark rum aged 7 years',
            'brand': 'Havana Club',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Cuba',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Malibu Coconut Rum',
            'category': 'rum',
            'barcode': '089540448027',
            'price': 2100.00,
            'cost': 1500.00,
            'stock': 26,
            'min_stock_level': 5,
            'max_stock_level': 40,
            'description': 'Caribbean rum with coconut liqueur',
            'brand': 'Malibu',
            'size': '750ml',
            'alcohol_content': 21.0,
            'country_of_origin': 'Barbados',
            'supplier': 'Diageo Kenya'
        },
        
        # Tequila
        {
            'name': 'Patrón Silver Tequila',
            'category': 'tequila',
            'barcode': '721733000039',
            'price': 8000.00,
            'cost': 6000.00,
            'stock': 5,
            'min_stock_level': 2,
            'max_stock_level': 15,
            'description': 'Ultra-premium 100% agave tequila',
            'brand': 'Patrón',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Mexico',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Jose Cuervo Especial Gold',
            'category': 'tequila',
            'barcode': '811538017307',
            'price': 3800.00,
            'cost': 2700.00,
            'stock': 19,
            'min_stock_level': 5,
            'max_stock_level': 35,
            'description': 'Blend of reposado and joven tequilas',
            'brand': 'Jose Cuervo',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Mexico',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Don Julio Blanco',
            'category': 'tequila',
            'barcode': '674545000035',
            'price': 9500.00,
            'cost': 7200.00,
            'stock': 6,
            'min_stock_level': 2,
            'max_stock_level': 12,
            'description': 'Premium unaged 100% blue agave',
            'brand': 'Don Julio',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'Mexico',
            'supplier': 'Pernod Ricard'
        },
        
        # Champagne
        {
            'name': 'Dom Pérignon Champagne',
            'category': 'champagne',
            'barcode': '3185370660108',
            'price': 25000.00,
            'cost': 18000.00,
            'stock': 3,
            'min_stock_level': 1,
            'max_stock_level': 8,
            'description': 'Luxury French champagne',
            'brand': 'Dom Pérignon',
            'size': '750ml',
            'alcohol_content': 12.5,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Moët & Chandon Brut',
            'category': 'champagne',
            'barcode': '3185370000038',
            'price': 11000.00,
            'cost': 8200.00,
            'stock': 7,
            'min_stock_level': 2,
            'max_stock_level': 15,
            'description': 'Iconic French champagne',
            'brand': 'Moët & Chandon',
            'size': '750ml',
            'alcohol_content': 12.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Veuve Clicquot Yellow Label',
            'category': 'champagne',
            'barcode': '3049610004121',
            'price': 12500.00,
            'cost': 9400.00,
            'stock': 8,
            'min_stock_level': 2,
            'max_stock_level': 18,
            'description': 'Iconic brut champagne',
            'brand': 'Veuve Clicquot',
            'size': '750ml',
            'alcohol_content': 12.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Laurent-Perrier La Cuvée',
            'category': 'champagne',
            'barcode': '3258434300003',
            'price': 12000.00,
            'cost': 9000.00,
            'stock': 10,
            'min_stock_level': 2,
            'max_stock_level': 20,
            'description': 'Elegant and fresh brut champagne',
            'brand': 'Laurent-Perrier',
            'size': '750ml',
            'alcohol_content': 12.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        
        # Wine
        {
            'name': 'Campo Viejo Rioja Tempranillo',
            'category': 'wine',
            'barcode': '8410302106120',
            'price': 1900.00,
            'cost': 1200.00,
            'stock': 28,
            'min_stock_level': 5,
            'max_stock_level': 50,
            'description': 'Spanish red wine with ripe fruit',
            'brand': 'Campo Viejo',
            'size': '750ml',
            'alcohol_content': 13.5,
            'country_of_origin': 'Spain',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Jacob\'s Creek Chardonnay',
            'category': 'wine',
            'barcode': '9311043085209',
            'price': 1600.00,
            'cost': 1000.00,
            'stock': 30,
            'min_stock_level': 5,
            'max_stock_level': 60,
            'description': 'Australian white wine, crisp and fresh',
            'brand': 'Jacob\'s Creek',
            'size': '750ml',
            'alcohol_content': 13.0,
            'country_of_origin': 'Australia',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Barefoot Merlot',
            'category': 'wine',
            'barcode': '085000021304',
            'price': 1400.00,
            'cost': 900.00,
            'stock': 42,
            'min_stock_level': 10,
            'max_stock_level': 80,
            'description': 'California merlot with soft tannins',
            'brand': 'Barefoot',
            'size': '750ml',
            'alcohol_content': 13.5,
            'country_of_origin': 'USA',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Oyster Bay Sauvignon Blanc',
            'category': 'wine',
            'barcode': '9415549800983',
            'price': 2100.00,
            'cost': 1400.00,
            'stock': 24,
            'min_stock_level': 5,
            'max_stock_level': 45,
            'description': 'New Zealand crisp white wine',
            'brand': 'Oyster Bay',
            'size': '750ml',
            'alcohol_content': 13.0,
            'country_of_origin': 'New Zealand',
            'supplier': 'Pernod Ricard'
        },
        
        # Beer
        {
            'name': 'Tusker Lager',
            'category': 'beer',
            'barcode': '6161100240015',
            'price': 150.00,
            'cost': 90.00,
            'stock': 200,
            'min_stock_level': 50,
            'max_stock_level': 500,
            'description': 'Kenyan premium lager',
            'brand': 'Tusker',
            'size': '500ml',
            'alcohol_content': 4.2,
            'country_of_origin': 'Kenya',
            'supplier': 'East African Breweries'
        },
        {
            'name': 'Heineken Lager 330ml',
            'category': 'beer',
            'barcode': '8712000059679',
            'price': 230.00,
            'cost': 140.00,
            'stock': 180,
            'min_stock_level': 30,
            'max_stock_level': 400,
            'description': 'International premium beer',
            'brand': 'Heineken',
            'size': '330ml',
            'alcohol_content': 5.0,
            'country_of_origin': 'Netherlands',
            'supplier': 'East African Breweries'
        },
        {
            'name': 'Guinness Stout 500ml',
            'category': 'beer',
            'barcode': '5099873022115',
            'price': 280.00,
            'cost': 170.00,
            'stock': 95,
            'min_stock_level': 20,
            'max_stock_level': 200,
            'description': 'Rich and creamy stout',
            'brand': 'Guinness',
            'size': '500ml',
            'alcohol_content': 4.2,
            'country_of_origin': 'Ireland',
            'supplier': 'Diageo Kenya'
        },
        {
            'name': 'Budweiser 355ml',
            'category': 'beer',
            'barcode': '018200105406',
            'price': 200.00,
            'cost': 120.00,
            'stock': 220,
            'min_stock_level': 50,
            'max_stock_level': 500,
            'description': 'American lager beer',
            'brand': 'Budweiser',
            'size': '355ml',
            'alcohol_content': 5.0,
            'country_of_origin': 'USA',
            'supplier': 'East African Breweries'
        },
        {
            'name': 'Corona Extra 355ml',
            'category': 'beer',
            'barcode': '071990010023',
            'price': 240.00,
            'cost': 150.00,
            'stock': 160,
            'min_stock_level': 30,
            'max_stock_level': 350,
            'description': 'Mexican pale lager',
            'brand': 'Corona',
            'size': '355ml',
            'alcohol_content': 4.5,
            'country_of_origin': 'Mexico',
            'supplier': 'East African Breweries'
        },
        
        # Cognac
        {
            'name': 'Hennessy VS Cognac',
            'category': 'cognac',
            'barcode': '3245990250206',
            'price': 9000.00,
            'cost': 6800.00,
            'stock': 8,
            'min_stock_level': 2,
            'max_stock_level': 20,
            'description': 'Classic VS Cognac',
            'brand': 'Hennessy',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Courvoisier VS',
            'category': 'cognac',
            'barcode': '3049197210203',
            'price': 8500.00,
            'cost': 6300.00,
            'stock': 9,
            'min_stock_level': 2,
            'max_stock_level': 18,
            'description': 'Balanced and elegant VS cognac',
            'brand': 'Courvoisier',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        },
        {
            'name': 'Rémy Martin VSOP',
            'category': 'cognac',
            'barcode': '3024480006852',
            'price': 14000.00,
            'cost': 10800.00,
            'stock': 5,
            'min_stock_level': 1,
            'max_stock_level': 12,
            'description': 'Fine Champagne Cognac, VSOP',
            'brand': 'Rémy Martin',
            'size': '750ml',
            'alcohol_content': 40.0,
            'country_of_origin': 'France',
            'supplier': 'Pernod Ricard'
        }
    ]
    
    # Process products to add category_id
    products_data = []
    for product_data in products_data_raw:
        product_data['category_id'] = categories[product_data['category']].id
        products_data.append(product_data)
    
    for product_data in products_data:
        product = Product(**product_data)
        db.session.add(product)
    
    db.session.commit()
    
    # Create customers
    print("Creating customers...")
    customers_data = [
        {
            'name': 'James Kariuki',
            'email': 'james@email.com',
            'phone': '+254712345678',
            'category': CustomerCategory.VIP,
            'total_purchases': Decimal('125000.00'),
            'last_purchase_date': datetime.now() - timedelta(days=2),
            'address': 'Westlands, Nairobi'
        },
        {
            'name': 'Grace Wanjiku',
            'email': 'grace@email.com',
            'phone': '+254723456789',
            'category': CustomerCategory.REGULAR,
            'total_purchases': Decimal('45000.00'),
            'last_purchase_date': datetime.now() - timedelta(days=5),
            'address': 'Karen, Nairobi'
        },
        {
            'name': 'Peter Mwangi',
            'email': 'peter@email.com',
            'phone': '+254734567890',
            'category': CustomerCategory.NEW,
            'total_purchases': Decimal('8500.00'),
            'last_purchase_date': datetime.now() - timedelta(days=1),
            'address': 'Kilimani, Nairobi'
        },
        {
            'name': 'Sarah Ochieng',
            'email': 'sarah@email.com',
            'phone': '+254745678901',
            'category': CustomerCategory.VIP,
            'total_purchases': Decimal('89000.00'),
            'last_purchase_date': datetime.now() - timedelta(days=3),
            'address': 'Runda, Nairobi'
        },
        {
            'name': 'David Kimani',
            'email': 'david@email.com',
            'phone': '+254756789012',
            'category': CustomerCategory.REGULAR,
            'total_purchases': Decimal('32000.00'),
            'last_purchase_date': datetime.now() - timedelta(days=7),
            'address': 'Lavington, Nairobi'
        }
    ]
    
    for customer_data in customers_data:
        customer = Customer(**customer_data)
        db.session.add(customer)
    
    db.session.commit()
    
    # Create sample sales
    print("Creating sample sales...")
    products = Product.query.all()
    customers = Customer.query.all()
    employees = User.query.filter(User.role.in_([UserRole.EMPLOYEE, UserRole.MANAGER])).all()
    
    # Create sales for the last 30 days
    for i in range(50):
        sale_date = datetime.now() - timedelta(days=random.randint(0, 30))
        customer = random.choice(customers) if random.random() > 0.3 else None
        employee = random.choice(employees)
        
        # Create sale items
        num_items = random.randint(1, 5)
        sale_items = []
        total_amount = Decimal('0')
        
        for j in range(num_items):
            product = random.choice(products)
            quantity = random.randint(1, 3)
            unit_price = Decimal(str(product.price))
            total_price = unit_price * quantity
            
            sale_item = SaleItem(
                product_id=product.id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price
            )
            sale_items.append(sale_item)
            total_amount += total_price
        
        # Create sale
        sale = Sale(
            customer_id=customer.id if customer else None,
            employee_id=employee.id,
            total_amount=total_amount,
            payment_method=random.choice(list(PaymentMethod)),
            payment_reference=f"REF{random.randint(100000, 999999)}" if random.random() > 0.5 else None,
            sale_date=sale_date,
            receipt_number=f"RCP{random.randint(100000, 999999)}"
        )
        
        db.session.add(sale)
        db.session.flush()  # Get the sale ID
        
        # Add items to sale
        for item in sale_items:
            item.sale_id = sale.id
            db.session.add(item)
        
        # Update customer's last purchase date and total purchases
        if customer:
            customer.last_purchase_date = sale_date
            customer.total_purchases += total_amount
    
    db.session.commit()
    
    # Create system settings
    print("Creating system settings...")
    settings_data = [
        {
            'key': 'store_name',
            'value': 'Premium Liquor Store',
            'description': 'Name of the liquor store',
            'data_type': 'string',
            'is_public': True
        },
        {
            'key': 'store_address',
            'value': 'Westlands, Nairobi, Kenya',
            'description': 'Store physical address',
            'data_type': 'string',
            'is_public': True
        },
        {
            'key': 'store_phone',
            'value': '+254700000000',
            'description': 'Store contact phone number',
            'data_type': 'string',
            'is_public': True
        },
        {
            'key': 'store_email',
            'value': 'info@liquorstore.com',
            'description': 'Store contact email',
            'data_type': 'string',
            'is_public': True
        },
        {
            'key': 'currency',
            'value': 'KSH',
            'description': 'Store currency',
            'data_type': 'string',
            'is_public': True
        },
        {
            'key': 'tax_rate',
            'value': '16.0',
            'description': 'Default tax rate percentage',
            'data_type': 'number',
            'is_public': False
        },
        {
            'key': 'low_stock_threshold',
            'value': '10',
            'description': 'Default low stock threshold',
            'data_type': 'number',
            'is_public': False
        },
        {
            'key': 'receipt_footer',
            'value': 'Thank you for your business!',
            'description': 'Receipt footer message',
            'data_type': 'string',
            'is_public': False
        }
    ]
    
    for setting_data in settings_data:
        setting = SystemSettings(**setting_data)
        db.session.add(setting)
    
    db.session.commit()
    
    # Create sample notifications
    print("Creating notifications...")
    notifications_data = [
        {
            'user_id': None,  # System-wide notification
            'title': 'Welcome to Premium Liquor Store POS',
            'message': 'The system has been successfully initialized with sample data.',
            'notification_type': NotificationType.SUCCESS
        },
        {
            'user_id': None,
            'title': 'Low Stock Alert',
            'message': 'Bacardi Superior Rum is out of stock. Please reorder.',
            'notification_type': NotificationType.WARNING
        },
        {
            'user_id': None,
            'title': 'System Maintenance',
            'message': 'Scheduled maintenance will occur tonight at 2 AM.',
            'notification_type': NotificationType.INFO
        }
    ]
    
    for notification_data in notifications_data:
        notification = Notification(**notification_data)
        db.session.add(notification)
    
    db.session.commit()
    
    print("Database seeded successfully!")
    print(f"Created:")
    print(f"- {User.query.count()} users")
    print(f"- {Category.query.count()} categories")
    print(f"- {Product.query.count()} products")
    print(f"- {Customer.query.count()} customers")
    print(f"- {Sale.query.count()} sales")
    print(f"- {SaleItem.query.count()} sale items")
    print(f"- {SystemSettings.query.count()} system settings")
    print(f"- {Notification.query.count()} notifications")
    print(f"- {Supplier.query.count()} suppliers")

if __name__ == '__main__':
    from app import app
    with app.app_context():
        seed_database()

