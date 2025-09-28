from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Customer, Sale, CustomerCategory
from decimal import Decimal
from datetime import datetime, date

customers_bp = Blueprint('customers', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@customers_bp.route('/customers', methods=['GET'])
@jwt_required()
def get_customers():
    """Get all customers with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        category = request.args.get('category', '')
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        # Build query
        query = Customer.query
        
        # Add search filter
        if search:
            query = query.filter(
                Customer.name.contains(search) | 
                Customer.email.contains(search) |
                Customer.phone.contains(search)
            )
        
        # Add category filter
        if category:
            query = query.filter(Customer.category == CustomerCategory(category))
        
        # Add active filter
        if active_only:
            query = query.filter(Customer.is_active == True)
        
        # Order by name
        query = query.order_by(Customer.name)
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        customers = []
        for customer in pagination.items:
            # Get customer statistics
            total_sales = len(customer.sales) if customer.sales else 0
            last_sale_date = None
            if customer.sales:
                last_sale = max(customer.sales, key=lambda s: s.sale_date)
                last_sale_date = last_sale.sale_date.isoformat()
            
            customers.append({
                'id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'phone': customer.phone,
                'category': customer.category.value if customer.category else None,
                'total_purchases': float(customer.total_purchases),
                'last_purchase_date': customer.last_purchase_date.isoformat() if customer.last_purchase_date else None,
                'address': customer.address,
                'date_of_birth': customer.date_of_birth.isoformat() if customer.date_of_birth else None,
                'is_active': customer.is_active,
                'total_sales': total_sales,
                'last_sale_date': last_sale_date,
                'created_at': customer.created_at.isoformat() if customer.created_at else None,
                'updated_at': customer.updated_at.isoformat() if customer.updated_at else None
            })
        
        return jsonify({
            'customers': customers,
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

@customers_bp.route('/customers/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_customer(customer_id):
    """Get a specific customer by ID with detailed information"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        
        # Get customer's sales history
        sales_data = []
        if customer.sales:
            for sale in customer.sales:
                sales_data.append({
                    'id': sale.id,
                    'total_amount': float(sale.total_amount),
                    'payment_method': sale.payment_method.value if sale.payment_method else None,
                    'sale_date': sale.sale_date.isoformat(),
                    'receipt_number': sale.receipt_number,
                    'items_count': len(sale.items) if sale.items else 0
                })
        
        return jsonify({
            'id': customer.id,
            'name': customer.name,
            'email': customer.email,
            'phone': customer.phone,
            'category': customer.category.value if customer.category else None,
            'total_purchases': float(customer.total_purchases),
            'last_purchase_date': customer.last_purchase_date.isoformat() if customer.last_purchase_date else None,
            'address': customer.address,
            'date_of_birth': customer.date_of_birth.isoformat() if customer.date_of_birth else None,
            'is_active': customer.is_active,
            'created_at': customer.created_at.isoformat() if customer.created_at else None,
            'updated_at': customer.updated_at.isoformat() if customer.updated_at else None,
            'sales_history': sales_data,
            'total_sales': len(sales_data),
            'average_sale': float(customer.total_purchases / len(sales_data)) if sales_data else 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/customers', methods=['POST'])
@jwt_required()
def create_customer():
    """Create a new customer"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Customer name is required'}), 400
        
        # Check if email already exists (if provided)
        if data.get('email'):
            existing_customer = Customer.query.filter_by(email=data['email']).first()
            if existing_customer:
                return jsonify({'error': 'Customer with this email already exists'}), 400
        
        # Parse date of birth if provided
        date_of_birth = None
        if data.get('date_of_birth'):
            try:
                date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Create new customer
        customer = Customer(
            name=data['name'],
            email=data.get('email'),
            phone=data.get('phone'),
            category=CustomerCategory(data['category']) if data.get('category') else CustomerCategory.NEW,
            total_purchases=Decimal(str(data.get('total_purchases', 0))),
            address=data.get('address'),
            date_of_birth=date_of_birth,
            is_active=data.get('is_active', True)
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return jsonify({
            'message': 'Customer created successfully',
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'phone': customer.phone,
                'category': customer.category.value if customer.category else None,
                'created_at': customer.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/customers/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    """Update an existing customer"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update fields
        if 'name' in data:
            customer.name = data['name']
        
        if 'email' in data:
            if data['email']:
                existing_customer = Customer.query.filter(
                    Customer.email == data['email'],
                    Customer.id != customer_id
                ).first()
                if existing_customer:
                    return jsonify({'error': 'Customer with this email already exists'}), 400
            customer.email = data['email']
        
        if 'phone' in data:
            customer.phone = data['phone']
        
        if 'category' in data:
            if data['category']:
                customer.category = CustomerCategory(data['category'])
        
        if 'address' in data:
            customer.address = data['address']
        
        if 'date_of_birth' in data:
            if data['date_of_birth']:
                try:
                    customer.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
            else:
                customer.date_of_birth = None
        
        if 'is_active' in data:
            customer.is_active = data['is_active']
        
        customer.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Customer updated successfully',
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'phone': customer.phone,
                'category': customer.category.value if customer.category else None,
                'updated_at': customer.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    """Delete a customer (soft delete by setting is_active to False)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        customer = Customer.query.get_or_404(customer_id)
        
        # Check if customer has sales
        if customer.sales:
            return jsonify({
                'error': 'Cannot delete customer with existing sales. Please deactivate instead.'
            }), 400
        
        # Soft delete by setting is_active to False
        customer.is_active = False
        customer.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Customer deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/customers/<int:customer_id>/sales', methods=['GET'])
@jwt_required()
def get_customer_sales(customer_id):
    """Get sales history for a specific customer"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        customer = Customer.query.get_or_404(customer_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query customer's sales
        query = Sale.query.filter_by(customer_id=customer_id).order_by(Sale.sale_date.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        sales = []
        for sale in pagination.items:
            sales.append({
                'id': sale.id,
                'total_amount': float(sale.total_amount),
                'payment_method': sale.payment_method.value if sale.payment_method else None,
                'payment_reference': sale.payment_reference,
                'discount_amount': float(sale.discount_amount),
                'tax_amount': float(sale.tax_amount),
                'sale_date': sale.sale_date.isoformat(),
                'notes': sale.notes,
                'receipt_number': sale.receipt_number,
                'employee_name': sale.employee.name if sale.employee else None,
                'items_count': len(sale.items) if sale.items else 0,
                'items': [
                    {
                        'id': item.id,
                        'product_name': item.product.name if item.product else 'Unknown Product',
                        'quantity': item.quantity,
                        'unit_price': float(item.unit_price),
                        'total_price': float(item.total_price),
                        'discount_amount': float(item.discount_amount)
                    } for item in sale.items
                ] if sale.items else []
            })
        
        return jsonify({
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'email': customer.email
            },
            'sales': sales,
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

@customers_bp.route('/customers/stats', methods=['GET'])
@jwt_required()
def get_customer_stats():
    """Get customer statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        total_customers = Customer.query.count()
        active_customers = Customer.query.filter(Customer.is_active == True).count()
        inactive_customers = total_customers - active_customers
        
        # Category distribution
        category_stats = db.session.query(
            Customer.category,
            db.func.count(Customer.id).label('count')
        ).group_by(Customer.category).all()
        
        category_data = [
            {
                'category': stat.category.value if stat.category else None,
                'count': stat.count
            } for stat in category_stats
        ]
        
        # Top customers by total purchases
        top_customers = Customer.query.order_by(
            Customer.total_purchases.desc()
        ).limit(10).all()
        
        top_customers_data = [
            {
                'id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'category': customer.category.value if customer.category else None,
                'total_purchases': float(customer.total_purchases),
                'sales_count': len(customer.sales) if customer.sales else 0
            } for customer in top_customers
        ]
        
        # Recent customers
        recent_customers = Customer.query.order_by(
            Customer.created_at.desc()
        ).limit(5).all()
        
        recent_customers_data = [
            {
                'id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'created_at': customer.created_at.isoformat()
            } for customer in recent_customers
        ]
        
        return jsonify({
            'total_customers': total_customers,
            'active_customers': active_customers,
            'inactive_customers': inactive_customers,
            'category_distribution': category_data,
            'top_customers': top_customers_data,
            'recent_customers': recent_customers_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/customers/<int:customer_id>/activate', methods=['PUT'])
@jwt_required()
def activate_customer(customer_id):
    """Activate a deactivated customer"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        customer = Customer.query.get_or_404(customer_id)
        
        customer.is_active = True
        customer.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Customer activated successfully',
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'is_active': customer.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
