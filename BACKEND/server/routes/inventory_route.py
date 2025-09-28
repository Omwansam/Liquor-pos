from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import InventoryTransaction, Product, User, TransactionType
from decimal import Decimal
from datetime import datetime

inventory_bp = Blueprint('inventory', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@inventory_bp.route('/inventory/transactions', methods=['GET'])
@jwt_required()
def get_inventory_transactions():
    """Get all inventory transactions with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        product_id = request.args.get('product_id', type=int)
        transaction_type = request.args.get('transaction_type', '')
        created_by = request.args.get('created_by', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Build query
        query = InventoryTransaction.query
        
        # Add filters
        if product_id:
            query = query.filter(InventoryTransaction.product_id == product_id)
        
        if transaction_type:
            try:
                query = query.filter(InventoryTransaction.transaction_type == TransactionType(transaction_type))
            except ValueError:
                return jsonify({'error': 'Invalid transaction_type'}), 400
        
        if created_by:
            query = query.filter(InventoryTransaction.created_by == created_by)
        
        # Add date range filter
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(InventoryTransaction.created_at >= start_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(InventoryTransaction.created_at < end_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Order by created date (newest first)
        query = query.order_by(InventoryTransaction.created_at.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        transactions = []
        for transaction in pagination.items:
            transactions.append({
                'id': transaction.id,
                'product_id': transaction.product_id,
                'product_name': transaction.product.name if transaction.product else 'Unknown Product',
                'transaction_type': transaction.transaction_type.value if transaction.transaction_type else None,
                'quantity_change': transaction.quantity_change,
                'previous_stock': transaction.previous_stock,
                'new_stock': transaction.new_stock,
                'reference_id': transaction.reference_id,
                'notes': transaction.notes,
                'created_by': transaction.created_by,
                'created_by_name': transaction.created_by_user.name if transaction.created_by_user else 'System',
                'created_at': transaction.created_at.isoformat()
            })
        
        return jsonify({
            'transactions': transactions,
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

@inventory_bp.route('/inventory/transactions/<int:transaction_id>', methods=['GET'])
@jwt_required()
def get_inventory_transaction(transaction_id):
    """Get a specific inventory transaction by ID"""
    try:
        transaction = InventoryTransaction.query.get_or_404(transaction_id)
        
        return jsonify({
            'id': transaction.id,
            'product_id': transaction.product_id,
            'product': {
                'id': transaction.product.id,
                'name': transaction.product.name,
                'barcode': transaction.product.barcode,
                'current_stock': transaction.product.stock
            } if transaction.product else None,
            'transaction_type': transaction.transaction_type.value if transaction.transaction_type else None,
            'quantity_change': transaction.quantity_change,
            'previous_stock': transaction.previous_stock,
            'new_stock': transaction.new_stock,
            'reference_id': transaction.reference_id,
            'notes': transaction.notes,
            'created_by': transaction.created_by,
            'created_by_user': {
                'id': transaction.created_by_user.id,
                'name': transaction.created_by_user.name,
                'username': transaction.created_by_user.username
            } if transaction.created_by_user else None,
            'created_at': transaction.created_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@inventory_bp.route('/inventory/transactions', methods=['POST'])
@jwt_required()
def create_inventory_transaction():
    """Create a new inventory transaction (restock, adjustment, etc.)"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['product_id', 'transaction_type', 'quantity_change']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate product exists
        product = Product.query.get(data['product_id'])
        if not product:
            return jsonify({'error': 'Invalid product_id'}), 400
        
        # Validate transaction type
        try:
            transaction_type = TransactionType(data['transaction_type'])
        except ValueError:
            return jsonify({'error': 'Invalid transaction_type'}), 400
        
        quantity_change = data['quantity_change']
        
        # Validate quantity change based on transaction type
        if transaction_type == TransactionType.SALE and quantity_change >= 0:
            return jsonify({'error': 'Sale transactions must have negative quantity_change'}), 400
        
        if transaction_type in [TransactionType.RESTOCK, TransactionType.ADJUSTMENT] and quantity_change == 0:
            return jsonify({'error': 'Quantity change cannot be zero for restock/adjustment'}), 400
        
        # Calculate new stock
        previous_stock = product.stock
        new_stock = previous_stock + quantity_change
        
        # Validate new stock is not negative
        if new_stock < 0:
            return jsonify({
                'error': f'Insufficient stock. Current: {previous_stock}, Requested change: {quantity_change}'
            }), 400
        
        # Create inventory transaction
        transaction = InventoryTransaction(
            product_id=data['product_id'],
            transaction_type=transaction_type,
            quantity_change=quantity_change,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reference_id=data.get('reference_id'),
            notes=data.get('notes'),
            created_by=current_user_id
        )
        
        db.session.add(transaction)
        
        # Update product stock
        product.stock = new_stock
        
        db.session.commit()
        
        return jsonify({
            'message': 'Inventory transaction created successfully',
            'transaction': {
                'id': transaction.id,
                'product_name': product.name,
                'transaction_type': transaction.transaction_type.value,
                'quantity_change': transaction.quantity_change,
                'previous_stock': transaction.previous_stock,
                'new_stock': transaction.new_stock,
                'created_at': transaction.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@inventory_bp.route('/inventory/restock', methods=['POST'])
@jwt_required()
def restock_product():
    """Restock a product"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if 'product_id' not in data or 'quantity' not in data:
            return jsonify({'error': 'product_id and quantity are required'}), 400
        
        product_id = data['product_id']
        quantity = data['quantity']
        
        if quantity <= 0:
            return jsonify({'error': 'Quantity must be positive'}), 400
        
        # Validate product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Invalid product_id'}), 400
        
        # Calculate new stock
        previous_stock = product.stock
        new_stock = previous_stock + quantity
        
        # Create inventory transaction
        transaction = InventoryTransaction(
            product_id=product_id,
            transaction_type=TransactionType.RESTOCK,
            quantity_change=quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            notes=data.get('notes', f'Restocked {quantity} units'),
            created_by=current_user_id
        )
        
        db.session.add(transaction)
        
        # Update product stock
        product.stock = new_stock
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product restocked successfully',
            'transaction': {
                'id': transaction.id,
                'product_name': product.name,
                'quantity_added': quantity,
                'previous_stock': previous_stock,
                'new_stock': new_stock,
                'created_at': transaction.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@inventory_bp.route('/inventory/adjust', methods=['POST'])
@jwt_required()
def adjust_inventory():
    """Adjust product inventory (for corrections, damages, etc.)"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['product_id', 'new_stock', 'reason']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        product_id = data['product_id']
        new_stock = data['new_stock']
        
        if new_stock < 0:
            return jsonify({'error': 'Stock cannot be negative'}), 400
        
        # Validate product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Invalid product_id'}), 400
        
        # Calculate quantity change
        previous_stock = product.stock
        quantity_change = new_stock - previous_stock
        
        # Create inventory transaction
        transaction = InventoryTransaction(
            product_id=product_id,
            transaction_type=TransactionType.ADJUSTMENT,
            quantity_change=quantity_change,
            previous_stock=previous_stock,
            new_stock=new_stock,
            notes=f"Inventory adjustment: {data['reason']}",
            created_by=current_user_id
        )
        
        db.session.add(transaction)
        
        # Update product stock
        product.stock = new_stock
        
        db.session.commit()
        
        return jsonify({
            'message': 'Inventory adjusted successfully',
            'transaction': {
                'id': transaction.id,
                'product_name': product.name,
                'previous_stock': previous_stock,
                'new_stock': new_stock,
                'quantity_change': quantity_change,
                'reason': data['reason'],
                'created_at': transaction.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@inventory_bp.route('/inventory/stats', methods=['GET'])
@jwt_required()
def get_inventory_stats():
    """Get inventory statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        # Get date range from query params
        days = request.args.get('days', 30, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        # Total transactions
        total_transactions = InventoryTransaction.query.count()
        transactions_in_period = InventoryTransaction.query.filter(
            InventoryTransaction.created_at >= start_date
        ).count()
        
        # Transaction type distribution
        type_stats = db.session.query(
            InventoryTransaction.transaction_type,
            db.func.count(InventoryTransaction.id).label('count')
        ).filter(
            InventoryTransaction.created_at >= start_date
        ).group_by(InventoryTransaction.transaction_type).all()
        
        type_data = [
            {
                'transaction_type': stat.transaction_type.value if stat.transaction_type else None,
                'count': stat.count
            } for stat in type_stats
        ]
        
        # Most active products
        product_stats = db.session.query(
            Product.id,
            Product.name,
            db.func.count(InventoryTransaction.id).label('transaction_count')
        ).join(InventoryTransaction).filter(
            InventoryTransaction.created_at >= start_date
        ).group_by(Product.id, Product.name).order_by(
            db.func.count(InventoryTransaction.id).desc()
        ).limit(10).all()
        
        product_data = [
            {
                'product_id': stat.id,
                'product_name': stat.name,
                'transaction_count': stat.transaction_count
            } for stat in product_stats
        ]
        
        # Recent transactions
        recent_transactions = InventoryTransaction.query.order_by(
            InventoryTransaction.created_at.desc()
        ).limit(10).all()
        
        recent_data = [
            {
                'id': transaction.id,
                'product_name': transaction.product.name if transaction.product else 'Unknown',
                'transaction_type': transaction.transaction_type.value if transaction.transaction_type else None,
                'quantity_change': transaction.quantity_change,
                'created_by_name': transaction.created_by_user.name if transaction.created_by_user else 'System',
                'created_at': transaction.created_at.isoformat()
            } for transaction in recent_transactions
        ]
        
        return jsonify({
            'period_days': days,
            'total_transactions': total_transactions,
            'transactions_in_period': transactions_in_period,
            'transaction_type_distribution': type_data,
            'most_active_products': product_data,
            'recent_transactions': recent_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@inventory_bp.route('/inventory/products/<int:product_id>/history', methods=['GET'])
@jwt_required()
def get_product_inventory_history(product_id):
    """Get inventory history for a specific product"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        # Validate product exists
        product = Product.query.get_or_404(product_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query product's inventory transactions
        query = InventoryTransaction.query.filter_by(product_id=product_id).order_by(
            InventoryTransaction.created_at.desc()
        )
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        transactions = []
        for transaction in pagination.items:
            transactions.append({
                'id': transaction.id,
                'transaction_type': transaction.transaction_type.value if transaction.transaction_type else None,
                'quantity_change': transaction.quantity_change,
                'previous_stock': transaction.previous_stock,
                'new_stock': transaction.new_stock,
                'reference_id': transaction.reference_id,
                'notes': transaction.notes,
                'created_by_name': transaction.created_by_user.name if transaction.created_by_user else 'System',
                'created_at': transaction.created_at.isoformat()
            })
        
        return jsonify({
            'product': {
                'id': product.id,
                'name': product.name,
                'barcode': product.barcode,
                'current_stock': product.stock
            },
            'transactions': transactions,
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
