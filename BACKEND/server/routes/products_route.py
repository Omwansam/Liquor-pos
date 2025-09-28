from flask import Blueprint, request, jsonify, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Product, Category, ProductStatus
from decimal import Decimal
from datetime import datetime

products_bp = Blueprint('products', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@products_bp.route('/products', methods=['GET'])
@jwt_required()
def get_products():
    """Get all products with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        category = request.args.get('category', '')
        status = request.args.get('status', '')
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        low_stock = request.args.get('low_stock', 'false').lower() == 'true'
        employee_pos = request.args.get('employee_pos', 'false').lower() == 'true'
        
        # For employee POS, set default to 30 products per page
        if employee_pos and per_page == 20:
            per_page = 30
        
        # Build query
        query = Product.query
        
        # Add search filter
        if search:
            query = query.filter(
                Product.name.contains(search) | 
                Product.barcode.contains(search) |
                Product.brand.contains(search) |
                Product.description.contains(search)
            )
        
        # Add category filter
        if category:
            query = query.filter(Product.category == category)
        
        # Add status filter
        if status:
            if status == 'in_stock':
                query = query.filter(Product.stock > Product.min_stock_level)
            elif status == 'low_stock':
                query = query.filter(
                    Product.stock <= Product.min_stock_level,
                    Product.stock > 0
                )
            elif status == 'out_of_stock':
                query = query.filter(Product.stock == 0)
        
        # Add active filter
        if active_only:
            query = query.filter(Product.is_active == True)
        
        # Add low stock filter
        if low_stock:
            query = query.filter(Product.stock <= Product.min_stock_level)
        
        # Order by name
        query = query.order_by(Product.name)
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        products = []
        for product in pagination.items:
            products.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'category_id': product.category_id,
                'barcode': product.barcode,
                'price': float(product.price),
                'cost': float(product.cost),
                'stock': product.stock,
                'min_stock_level': product.min_stock_level,
                'max_stock_level': product.max_stock_level,
                'status': product.status,
                'profit_margin': product.profit_margin,
                'description': product.description,
                'brand': product.brand,
                'size': product.size,
                'alcohol_content': float(product.alcohol_content) if product.alcohol_content else None,
                'country_of_origin': product.country_of_origin,
                'supplier': product.supplier,
                'is_active': product.is_active,
                'created_at': product.created_at.isoformat() if product.created_at else None,
                'updated_at': product.updated_at.isoformat() if product.updated_at else None,
                'images': [
                    {
                        'image_id': img.image_id,
                        'image_url': url_for('static', filename=img.image_url, _external=True),
                        'is_primary': img.is_primary,
                        'alt_text': img.alt_text
                    } for img in product.images
                ] if product.images else []
            })
        
        return jsonify({
            'products': products,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/<int:product_id>', methods=['GET'])
@jwt_required()
def get_product(product_id):
    """Get a specific product by ID"""
    try:
        product = Product.query.get_or_404(product_id)
        
        return jsonify({
            'id': product.id,
            'name': product.name,
            'category': product.category,
            'category_id': product.category_id,
            'barcode': product.barcode,
            'price': float(product.price),
            'cost': float(product.cost),
            'stock': product.stock,
            'min_stock_level': product.min_stock_level,
            'max_stock_level': product.max_stock_level,
            'status': product.status,
            'profit_margin': product.profit_margin,
            'description': product.description,
            'brand': product.brand,
            'size': product.size,
            'alcohol_content': float(product.alcohol_content) if product.alcohol_content else None,
            'country_of_origin': product.country_of_origin,
            'supplier': product.supplier,
            'is_active': product.is_active,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None,
            'images': [
                {
                    'image_id': img.image_id,
                    'image_url': img.image_url,
                    'is_primary': img.is_primary,
                    'alt_text': img.alt_text
                } for img in product.images
            ] if product.images else []
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    """Create a new product"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'category', 'price', 'cost']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if barcode already exists (if provided)
        if data.get('barcode'):
            existing_product = Product.query.filter_by(barcode=data['barcode']).first()
            if existing_product:
                return jsonify({'error': 'Product with this barcode already exists'}), 400
        
        # Validate category exists
        if data.get('category_id'):
            category = Category.query.get(data['category_id'])
            if not category:
                return jsonify({'error': 'Invalid category_id'}), 400
        
        # Create new product
        product = Product(
            name=data['name'],
            category=data['category'],
            category_id=data.get('category_id'),
            barcode=data.get('barcode'),
            price=Decimal(str(data['price'])),
            cost=Decimal(str(data['cost'])),
            stock=data.get('stock', 0),
            min_stock_level=data.get('min_stock_level', 10),
            max_stock_level=data.get('max_stock_level', 100),
            description=data.get('description', ''),
            brand=data.get('brand'),
            size=data.get('size'),
            alcohol_content=Decimal(str(data['alcohol_content'])) if data.get('alcohol_content') else None,
            country_of_origin=data.get('country_of_origin'),
            supplier=data.get('supplier'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'message': 'Product created successfully',
            'product': {
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'category_id': product.category_id,
                'barcode': product.barcode,
                'price': float(product.price),
                'cost': float(product.cost),
                'stock': product.stock,
                'min_stock_level': product.min_stock_level,
                'max_stock_level': product.max_stock_level,
                'status': product.status,
                'profit_margin': product.profit_margin,
                'description': product.description,
                'brand': product.brand,
                'size': product.size,
                'alcohol_content': float(product.alcohol_content) if product.alcohol_content else None,
                'country_of_origin': product.country_of_origin,
                'supplier': product.supplier,
                'is_active': product.is_active,
                'created_at': product.created_at.isoformat() if product.created_at else None,
                'updated_at': product.updated_at.isoformat() if product.updated_at else None,
                'images': []
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Update an existing product"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        if not current_user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields if they're being updated
        if 'name' in data and not data['name']:
            return jsonify({'error': 'Product name cannot be empty'}), 400
        
        if 'price' in data and (not data['price'] or data['price'] <= 0):
            return jsonify({'error': 'Price must be greater than 0'}), 400
        
        if 'cost' in data and (not data['cost'] or data['cost'] < 0):
            return jsonify({'error': 'Cost cannot be negative'}), 400
        
        if 'stock' in data and data['stock'] < 0:
            return jsonify({'error': 'Stock cannot be negative'}), 400
        
        # Update fields
        if 'name' in data:
            product.name = data['name']
        
        if 'category' in data:
            product.category = data['category']
        
        if 'category_id' in data:
            if data['category_id']:
                category = Category.query.get(data['category_id'])
                if not category:
                    return jsonify({'error': 'Invalid category_id'}), 400
                product.category_id = data['category_id']
            else:
                product.category_id = None
        
        if 'barcode' in data:
            if data['barcode']:
                existing_product = Product.query.filter(
                    Product.barcode == data['barcode'],
                    Product.id != product_id
                ).first()
                if existing_product:
                    return jsonify({'error': 'Product with this barcode already exists'}), 400
                product.barcode = data['barcode']
            else:
                product.barcode = None
        
        if 'price' in data:
            product.price = Decimal(str(data['price']))
        
        if 'cost' in data:
            product.cost = Decimal(str(data['cost']))
        
        if 'stock' in data:
            product.stock = data['stock']
        
        if 'min_stock_level' in data:
            product.min_stock_level = data['min_stock_level']
        
        if 'max_stock_level' in data:
            product.max_stock_level = data['max_stock_level']
        
        if 'description' in data:
            product.description = data['description'] if data['description'] else None
        
        if 'brand' in data:
            product.brand = data['brand'] if data['brand'] else None
        
        if 'size' in data:
            product.size = data['size'] if data['size'] else None
        
        if 'alcohol_content' in data:
            product.alcohol_content = Decimal(str(data['alcohol_content'])) if data['alcohol_content'] else None
        
        if 'country_of_origin' in data:
            product.country_of_origin = data['country_of_origin'] if data['country_of_origin'] else None
        
        if 'supplier' in data:
            product.supplier = data['supplier'] if data['supplier'] else None
        
        if 'is_active' in data:
            product.is_active = data['is_active']
        
        product.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product updated successfully',
            'product': {
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'category_id': product.category_id,
                'barcode': product.barcode,
                'price': float(product.price),
                'cost': float(product.cost),
                'stock': product.stock,
                'min_stock_level': product.min_stock_level,
                'max_stock_level': product.max_stock_level,
                'status': product.status,
                'profit_margin': product.profit_margin,
                'description': product.description,
                'brand': product.brand,
                'size': product.size,
                'alcohol_content': float(product.alcohol_content) if product.alcohol_content else None,
                'country_of_origin': product.country_of_origin,
                'supplier': product.supplier,
                'is_active': product.is_active,
                'created_at': product.created_at.isoformat() if product.created_at else None,
                'updated_at': product.updated_at.isoformat() if product.updated_at else None,
                'images': [
                    {
                        'image_id': img.image_id,
                        'image_url': url_for('static', filename=img.image_url, _external=True),
                        'is_primary': img.is_primary,
                        'alt_text': img.alt_text
                    } for img in product.images
                ] if product.images else []
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating product {product_id}: {str(e)}")
        print(f"Data received: {data}")
        return jsonify({'error': f'Failed to update product: {str(e)}'}), 500

@products_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """Delete a product (soft delete by setting is_active to False)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        product = Product.query.get_or_404(product_id)
        
        # Check if product has sales
        if product.sale_items:
            return jsonify({
                'error': 'Cannot delete product with existing sales. Please deactivate instead.'
            }), 400
        
        # Soft delete by setting is_active to False
        product.is_active = False
        product.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/<int:product_id>/stock', methods=['PUT'])
@jwt_required()
def update_product_stock(product_id):
    """Update product stock levels"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        new_stock = data.get('stock')
        if new_stock is None:
            return jsonify({'error': 'Stock value is required'}), 400
        
        # Update stock
        old_stock = product.stock
        product.stock = new_stock
        product.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product stock updated successfully',
            'product': {
                'id': product.id,
                'name': product.name,
                'old_stock': old_stock,
                'new_stock': product.stock,
                'status': product.status,
                'updated_at': product.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/stats', methods=['GET'])
@jwt_required()
def get_product_stats():
    """Get product statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        total_products = Product.query.count()
        active_products = Product.query.filter(Product.is_active == True).count()
        inactive_products = total_products - active_products
        
        # Stock status counts
        out_of_stock = Product.query.filter(Product.stock == 0).count()
        low_stock = Product.query.filter(
            Product.stock <= Product.min_stock_level,
            Product.stock > 0
        ).count()
        in_stock = Product.query.filter(Product.stock > Product.min_stock_level).count()
        
        # Category distribution
        category_stats = db.session.query(
            Product.category,
            db.func.count(Product.id).label('count'),
            db.func.sum(Product.stock).label('total_stock')
        ).group_by(Product.category).all()
        
        category_data = [
            {
                'category': stat.category,
                'count': stat.count,
                'total_stock': int(stat.total_stock or 0)
            } for stat in category_stats
        ]
        
        # Top products by stock value
        top_stock_products = Product.query.order_by(
            (Product.stock * Product.price).desc()
        ).limit(10).all()
        
        top_stock_data = [
            {
                'id': product.id,
                'name': product.name,
                'stock': product.stock,
                'price': float(product.price),
                'stock_value': float(product.stock * product.price)
            } for product in top_stock_products
        ]
        
        return jsonify({
            'total_products': total_products,
            'active_products': active_products,
            'inactive_products': inactive_products,
            'stock_status': {
                'in_stock': in_stock,
                'low_stock': low_stock,
                'out_of_stock': out_of_stock
            },
            'category_distribution': category_data,
            'top_stock_products': top_stock_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/products/low-stock', methods=['GET'])
@jwt_required()
def get_low_stock_products():
    """Get products with low stock levels"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query for low stock products
        query = Product.query.filter(
            Product.stock <= Product.min_stock_level,
            Product.is_active == True
        ).order_by(Product.stock.asc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        products = []
        for product in pagination.items:
            products.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'barcode': product.barcode,
                'stock': product.stock,
                'min_stock_level': product.min_stock_level,
                'max_stock_level': product.max_stock_level,
                'status': product.status,
                'price': float(product.price),
                'supplier': product.supplier,
                'images': [
                    {
                        'image_id': img.image_id,
                        'image_url': url_for('static', filename=img.image_url, _external=True),
                        'is_primary': img.is_primary,
                        'alt_text': img.alt_text
                    } for img in product.images
                ] if product.images else []
            })
        
        return jsonify({
            'products': products,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
