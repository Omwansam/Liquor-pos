from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Supplier, Product
from datetime import datetime

suppliers_bp = Blueprint('suppliers', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@suppliers_bp.route('/suppliers', methods=['GET'])
@jwt_required()
def get_suppliers():
    """Get all suppliers with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        # Build query
        query = Supplier.query
        
        # Add search filter
        if search:
            query = query.filter(
                Supplier.name.contains(search) | 
                Supplier.contact_person.contains(search) |
                Supplier.email.contains(search)
            )
        
        # Add active filter
        if active_only:
            query = query.filter(Supplier.is_active == True)
        
        # Order by name
        query = query.order_by(Supplier.name)
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        suppliers = []
        for supplier in pagination.items:
            # Get supplier's products count
            products_count = Product.query.filter_by(supplier=supplier.name).count()
            
            suppliers.append({
                'id': supplier.id,
                'name': supplier.name,
                'contact_person': supplier.contact_person,
                'email': supplier.email,
                'phone': supplier.phone,
                'address': supplier.address,
                'payment_terms': supplier.payment_terms,
                'is_active': supplier.is_active,
                'products_count': products_count,
                'created_at': supplier.created_at.isoformat() if supplier.created_at else None,
                'updated_at': supplier.updated_at.isoformat() if supplier.updated_at else None
            })
        
        return jsonify({
            'suppliers': suppliers,
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

@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
@jwt_required()
def get_supplier(supplier_id):
    """Get a specific supplier by ID"""
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        
        # Get supplier's products
        products = Product.query.filter_by(supplier=supplier.name).all()
        products_data = [
            {
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'price': float(product.price),
                'cost': float(product.cost),
                'stock': product.stock,
                'status': product.status
            } for product in products
        ]
        
        return jsonify({
            'id': supplier.id,
            'name': supplier.name,
            'contact_person': supplier.contact_person,
            'email': supplier.email,
            'phone': supplier.phone,
            'address': supplier.address,
            'payment_terms': supplier.payment_terms,
            'is_active': supplier.is_active,
            'products': products_data,
            'products_count': len(products_data),
            'created_at': supplier.created_at.isoformat() if supplier.created_at else None,
            'updated_at': supplier.updated_at.isoformat() if supplier.updated_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@suppliers_bp.route('/suppliers', methods=['POST'])
@jwt_required()
def create_supplier():
    """Create a new supplier (admin/manager only)"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Supplier name is required'}), 400
        
        # Check if supplier name already exists
        existing_supplier = Supplier.query.filter_by(name=data['name']).first()
        if existing_supplier:
            return jsonify({'error': 'Supplier with this name already exists'}), 400
        
        # Create new supplier
        supplier = Supplier(
            name=data['name'],
            contact_person=data.get('contact_person'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            payment_terms=data.get('payment_terms'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(supplier)
        db.session.commit()
        
        return jsonify({
            'message': 'Supplier created successfully',
            'supplier': {
                'id': supplier.id,
                'name': supplier.name,
                'contact_person': supplier.contact_person,
                'email': supplier.email,
                'phone': supplier.phone,
                'address': supplier.address,
                'payment_terms': supplier.payment_terms,
                'is_active': supplier.is_active,
                'created_at': supplier.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
@jwt_required()
def update_supplier(supplier_id):
    """Update an existing supplier (admin/manager only)"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        supplier = Supplier.query.get_or_404(supplier_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update fields
        if 'name' in data:
            # Check if new name already exists (excluding current supplier)
            existing_supplier = Supplier.query.filter(
                Supplier.name == data['name'],
                Supplier.id != supplier_id
            ).first()
            if existing_supplier:
                return jsonify({'error': 'Supplier with this name already exists'}), 400
            supplier.name = data['name']
        
        if 'contact_person' in data:
            supplier.contact_person = data['contact_person']
        
        if 'email' in data:
            supplier.email = data['email']
        
        if 'phone' in data:
            supplier.phone = data['phone']
        
        if 'address' in data:
            supplier.address = data['address']
        
        if 'payment_terms' in data:
            supplier.payment_terms = data['payment_terms']
        
        if 'is_active' in data:
            supplier.is_active = data['is_active']
        
        supplier.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Supplier updated successfully',
            'supplier': {
                'id': supplier.id,
                'name': supplier.name,
                'contact_person': supplier.contact_person,
                'email': supplier.email,
                'phone': supplier.phone,
                'address': supplier.address,
                'payment_terms': supplier.payment_terms,
                'is_active': supplier.is_active,
                'updated_at': supplier.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@jwt_required()
def delete_supplier(supplier_id):
    """Delete a supplier (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        supplier = Supplier.query.get_or_404(supplier_id)
        
        # Check if supplier has products
        products_count = Product.query.filter_by(supplier=supplier.name).count()
        if products_count > 0:
            return jsonify({
                'error': f'Cannot delete supplier with {products_count} products. Please reassign or delete products first.'
            }), 400
        
        # Soft delete by setting is_active to False
        supplier.is_active = False
        supplier.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Supplier deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@suppliers_bp.route('/suppliers/<int:supplier_id>/products', methods=['GET'])
@jwt_required()
def get_supplier_products(supplier_id):
    """Get all products from a specific supplier"""
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        # Query supplier's products
        query = Product.query.filter_by(supplier=supplier.name)
        
        if active_only:
            query = query.filter(Product.is_active == True)
        
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
                'barcode': product.barcode,
                'price': float(product.price),
                'cost': float(product.cost),
                'stock': product.stock,
                'status': product.status,
                'is_active': product.is_active
            })
        
        return jsonify({
            'supplier': {
                'id': supplier.id,
                'name': supplier.name
            },
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

@suppliers_bp.route('/suppliers/stats', methods=['GET'])
@jwt_required()
def get_supplier_stats():
    """Get supplier statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        total_suppliers = Supplier.query.count()
        active_suppliers = Supplier.query.filter(Supplier.is_active == True).count()
        inactive_suppliers = total_suppliers - active_suppliers
        
        # Suppliers with products
        suppliers_with_products = db.session.query(
            Supplier.name,
            db.func.count(Product.id).label('product_count')
        ).outerjoin(Product, Supplier.name == Product.supplier).group_by(
            Supplier.name
        ).having(db.func.count(Product.id) > 0).all()
        
        suppliers_data = [
            {
                'name': stat.name,
                'product_count': stat.product_count
            } for stat in suppliers_with_products
        ]
        
        # Top suppliers by product count
        top_suppliers = sorted(suppliers_data, key=lambda x: x['product_count'], reverse=True)[:5]
        
        # Recent suppliers
        recent_suppliers = Supplier.query.order_by(
            Supplier.created_at.desc()
        ).limit(5).all()
        
        recent_suppliers_data = [
            {
                'id': supplier.id,
                'name': supplier.name,
                'contact_person': supplier.contact_person,
                'created_at': supplier.created_at.isoformat()
            } for supplier in recent_suppliers
        ]
        
        return jsonify({
            'total_suppliers': total_suppliers,
            'active_suppliers': active_suppliers,
            'inactive_suppliers': inactive_suppliers,
            'suppliers_with_products': len(suppliers_data),
            'suppliers_without_products': total_suppliers - len(suppliers_data),
            'top_suppliers': top_suppliers,
            'recent_suppliers': recent_suppliers_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@suppliers_bp.route('/suppliers/<int:supplier_id>/activate', methods=['PUT'])
@jwt_required()
def activate_supplier(supplier_id):
    """Activate a deactivated supplier"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        supplier = Supplier.query.get_or_404(supplier_id)
        
        supplier.is_active = True
        supplier.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Supplier activated successfully',
            'supplier': {
                'id': supplier.id,
                'name': supplier.name,
                'is_active': supplier.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
