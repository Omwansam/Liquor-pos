from flask import Flask, send_from_directory
from config import Config
from flask_cors import CORS
from extensions import db, migrate, jwt
from flask_jwt_extended import JWTManager
from models import User

import os

app = Flask(__name__)

app.config.from_object(Config)

CORS(app, 
     supports_credentials=True,
     origins=['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'])
db.init_app(app)
migrate.init_app(app, db)
jwt.init_app(app)

# Import and register routes
from routes.users_route import users_bp
from routes.productImage_route import product_image_bp
from routes.categories_route import categories_bp
from routes.products_route import products_bp
from routes.customers_route import customers_bp
from routes.sales_route import sales_bp
from routes.inventory_route import inventory_bp
from routes.notifications_route import notifications_bp
from routes.settings_route import settings_bp
from routes.suppliers_route import suppliers_bp
from routes.audit_route import audit_bp

app.register_blueprint(users_bp, url_prefix='/api')
app.register_blueprint(product_image_bp, url_prefix='/api/product-images')
app.register_blueprint(categories_bp, url_prefix='/api')
app.register_blueprint(products_bp, url_prefix='/api')
app.register_blueprint(customers_bp, url_prefix='/api')
app.register_blueprint(sales_bp, url_prefix='/api')
app.register_blueprint(inventory_bp, url_prefix='/api')
app.register_blueprint(notifications_bp, url_prefix='/api')
app.register_blueprint(settings_bp, url_prefix='/api')
app.register_blueprint(suppliers_bp, url_prefix='/api')
app.register_blueprint(audit_bp, url_prefix='/api')

@app.route('/')
def home():
    return "Hello, World!"


# Serve static files (uploads)
@app.route('/static/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory('static/uploads', filename)

# Also serve uploads at /uploads/ path for frontend compatibility
@app.route('/uploads/<path:filename>')
def serve_upload_alt(filename):
    return send_from_directory('static/uploads', filename)



if __name__ == '__main__':
    app.run(debug=True, port=5000)