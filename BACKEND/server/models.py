from extensions import db
from enum import Enum
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# Enums for better data integrity
class UserRole(Enum):
    ADMIN = 'admin'
    MANAGER = 'manager'
    EMPLOYEE = 'employee'
    STAFF = 'staff'

class CustomerCategory(Enum):
    VIP = 'VIP'
    REGULAR = 'Regular'
    NEW = 'New'

class PaymentMethod(Enum):
    CASH = 'cash'
    CARD = 'card'
    MPESA = 'mpesa'

class TransactionType(Enum):
    SALE = 'sale'
    RESTOCK = 'restock'
    ADJUSTMENT = 'adjustment'
    RETURN = 'return'

class NotificationType(Enum):
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    SUCCESS = 'success'

class ProductStatus(Enum):
    IN_STOCK = 'In Stock'
    LOW_STOCK = 'Low Stock'
    OUT_OF_STOCK = 'Out of Stock'

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    role = db.Column(db.Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationships
    sales = db.relationship('Sale', backref='employee', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

# Category Model
class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationships
    products = db.relationship('Product', backref='category_obj', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'

# Product Model
class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    barcode = db.Column(db.String(50), unique=True, nullable=True, index=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    cost = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, default=0, nullable=False)
    min_stock_level = db.Column(db.Integer, default=10, nullable=False)
    max_stock_level = db.Column(db.Integer, default=100, nullable=False)
    description = db.Column(db.Text, nullable=True)
    brand = db.Column(db.String(100), nullable=True)
    size = db.Column(db.String(50), nullable=True)  # e.g., "750ml", "1L"
    alcohol_content = db.Column(db.Numeric(5, 2), nullable=True)  # e.g., 40.0 for 40%
    country_of_origin = db.Column(db.String(100), nullable=True)
    supplier = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationships - backrefs defined in related models to avoid conflicts
    
    @property
    def status(self):
        """Calculate product status based on stock levels"""
        if self.stock == 0:
            return ProductStatus.OUT_OF_STOCK.value
        elif self.stock <= self.min_stock_level:
            return ProductStatus.LOW_STOCK.value
        else:
            return ProductStatus.IN_STOCK.value
    
    @property
    def profit_margin(self):
        """Calculate profit margin percentage"""
        if self.cost > 0:
            return round(((self.price - self.cost) / self.cost) * 100, 2)
        return 0
    
    def __repr__(self):
        return f'<Product {self.name}>'

# Product Image Model
class ProductImage(db.Model):
    __tablename__ = 'product_images'
    
    image_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)
    alt_text = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), nullable=False)
    
    # Relationships
    product = db.relationship('Product', backref='images')
    
    def __repr__(self):
        return f'<ProductImage {self.image_id}>'

# Customer Model
class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    phone = db.Column(db.String(20), nullable=True, index=True)
    category = db.Column(db.Enum(CustomerCategory), default=CustomerCategory.NEW, nullable=False)
    total_purchases = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    last_purchase_date = db.Column(db.DateTime(timezone=True), nullable=True)
    address = db.Column(db.Text, nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationships
    sales = db.relationship('Sale', backref='customer', lazy=True)
    
    def __repr__(self):
        return f'<Customer {self.name}>'

# Sale Model
class Sale(db.Model):
    __tablename__ = 'sales'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    payment_reference = db.Column(db.String(100), nullable=True)  # For card/MPesa transactions
    discount_amount = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    tax_amount = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    sale_date = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False, index=True)
    notes = db.Column(db.Text, nullable=True)
    receipt_number = db.Column(db.String(50), unique=True, nullable=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    
    # Additional indexes for better query performance
    __table_args__ = (
        db.Index('idx_sales_employee_date', 'employee_id', 'sale_date'),
        db.Index('idx_sales_customer_date', 'customer_id', 'sale_date'),
        db.Index('idx_sales_payment_method', 'payment_method'),
    )
    
    # Relationships
    items = db.relationship('SaleItem', backref='sale', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Sale {self.id}>'

# Sale Item Model
class SaleItem(db.Model):
    __tablename__ = 'sale_items'
    
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sales.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='RESTRICT'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    discount_amount = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    
    # Relationships
    product = db.relationship('Product', backref='sale_items')
    
    def __repr__(self):
        return f'<SaleItem {self.id}>'

# Inventory Transaction Model
class InventoryTransaction(db.Model):
    __tablename__ = 'inventory_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    transaction_type = db.Column(db.Enum(TransactionType), nullable=False)
    quantity_change = db.Column(db.Integer, nullable=False)  # Positive for restock, negative for sale
    previous_stock = db.Column(db.Integer, nullable=False)
    new_stock = db.Column(db.Integer, nullable=False)
    reference_id = db.Column(db.Integer, nullable=True)  # Sale ID or restock order ID
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    
    # Relationships
    product = db.relationship('Product', backref='inventory_transactions')
    created_by_user = db.relationship('User', backref='inventory_transactions', lazy=True)
    
    # Additional indexes for better query performance
    __table_args__ = (
        db.Index('idx_inventory_product_type', 'product_id', 'transaction_type'),
        db.Index('idx_inventory_created_by_date', 'created_by', 'created_at'),
    )
    
    def __repr__(self):
        return f'<InventoryTransaction {self.id}>'

# Notification Model
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)  # NULL for system-wide
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.Enum(NotificationType), default=NotificationType.INFO, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    action_url = db.Column(db.String(500), nullable=True)  # URL for action button
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), nullable=False)
    
    def __repr__(self):
        return f'<Notification {self.id}>'

# System Settings Model
class SystemSettings(db.Model):
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    data_type = db.Column(db.String(20), default='string', nullable=False)  # string, number, boolean, json
    is_public = db.Column(db.Boolean, default=False, nullable=False)  # Can be accessed without auth
    updated_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<SystemSettings {self.key}>'

# Supplier Model
class Supplier(db.Model):
    __tablename__ = 'suppliers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    contact_person = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    payment_terms = db.Column(db.String(100), nullable=True)  # e.g., "Net 30"
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<Supplier {self.name}>'

# Audit Log Model
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(100), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, etc.
    table_name = db.Column(db.String(50), nullable=True)
    record_id = db.Column(db.Integer, nullable=True)
    old_values = db.Column(db.JSON, nullable=True)
    new_values = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), nullable=False)
    
    # Relationships
    user = db.relationship('User', backref='audit_logs', lazy=True)
    
    def __repr__(self):
        return f'<AuditLog {self.id}>'

