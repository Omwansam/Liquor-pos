from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Sale, SaleItem, Product, Customer, User, PaymentMethod, MpesaTransaction, MpesaTransactionStatus, MpesaTransactionType
from utils.daraja_client import initiate_stk_push
from decimal import Decimal
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

sales_bp = Blueprint('sales', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

def get_current_user_info():
    """Helper function to get current user info including role from JWT"""
    from flask_jwt_extended import get_jwt
    current_identity = get_jwt_identity()
    claims = get_jwt()
    
    user_id = None
    if isinstance(current_identity, dict):
        user_id = current_identity.get('id')
    else:
        user_id = current_identity
    # Normalize role to uppercase so downstream checks work regardless of token casing
    role_claim = claims.get('role', 'EMPLOYEE')
    normalized_role = role_claim.upper() if isinstance(role_claim, str) else 'EMPLOYEE'
    return {
        'id': user_id,
        'role': normalized_role,
        'is_admin': claims.get('is_admin', False)
    }

@sales_bp.route('/sales', methods=['GET'])
@jwt_required()
def get_sales():
    """Get all sales with pagination and filtering"""
    try:
        # Get current user info
        current_user = get_current_user_info()
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        payment_method = request.args.get('payment_method', '')
        employee_id = request.args.get('employee_id', type=int)
        customer_id = request.args.get('customer_id', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        status = request.args.get('status', '')
        
        # Build query
        query = Sale.query
        
        # Role-based access control
        # If user is not admin/manager, only show their own sales
        if not current_user['is_admin'] and current_user['role'] not in ['ADMIN', 'MANAGER']:
            query = query.filter(Sale.employee_id == current_user['id'])
        # If admin/manager explicitly requests specific employee's sales, allow it
        elif employee_id and current_user['is_admin']:
            query = query.filter(Sale.employee_id == employee_id)
        
        # Add search filter (by receipt number or customer name)
        if search:
            query = query.join(Customer, Sale.customer_id == Customer.id, isouter=True).filter(
                Sale.receipt_number.contains(search) |
                Customer.name.contains(search)
            )
        
        # Add payment method filter
        if payment_method:
            query = query.filter(Sale.payment_method == PaymentMethod(payment_method))
        
        # Add employee filter
        if employee_id:
            query = query.filter(Sale.employee_id == employee_id)
        
        # Add customer filter
        if customer_id:
            query = query.filter(Sale.customer_id == customer_id)
        
        # Add date range filter (support both date_from/date_to and start_date/end_date)
        date_from_param = date_from or start_date
        date_to_param = date_to or end_date
        
        if date_from_param:
            try:
                start_date_obj = datetime.strptime(date_from_param, '%Y-%m-%d')
                query = query.filter(Sale.sale_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
        
        if date_to_param:
            try:
                end_date_obj = datetime.strptime(date_to_param, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(Sale.sale_date < end_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid date_to format. Use YYYY-MM-DD'}), 400
        
        # Add status filter
        if status and status != 'all':
            if status.lower() == 'completed':
                query = query.filter(Sale.status == 'completed')
            elif status.lower() == 'refunded':
                query = query.filter(Sale.status == 'refunded')
            elif status.lower() == 'cancelled':
                query = query.filter(Sale.status == 'cancelled')
        
        # Order by sale date (newest first)
        query = query.order_by(Sale.sale_date.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        sales = []
        for sale in pagination.items:
            # Get sale items with product details
            items = []
            if sale.items:
                for item in sale.items:
                    items.append({
                        'id': item.id,
                        'product_id': item.product_id,
                        'product_name': item.product.name if item.product else 'Unknown Product',
                        'quantity': item.quantity,
                        'unit_price': float(item.unit_price),
                        'total_price': float(item.total_price)
                    })
            
            sales.append({
                'id': sale.id,
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.name if sale.customer else None,
                'employee_id': sale.employee_id,
                'employee': {
                    'id': sale.employee.id if sale.employee else None,
                    'name': sale.employee.name if sale.employee else None,
                    'email': sale.employee.email if sale.employee else None
                },
                'total': float(sale.total_amount),
                'total_amount': float(sale.total_amount),  # Keep for backward compatibility
                'payment_method': sale.payment_method.value if sale.payment_method else None,
                'payment_reference': sale.payment_reference,
                'discount_amount': float(sale.discount_amount),
                'tax_amount': float(sale.tax_amount),
                'sale_date': sale.sale_date.isoformat(),
                'notes': sale.notes,
                'receipt_number': sale.receipt_number,
                'status': getattr(sale, 'status', 'completed'),  # Default to completed if no status field
                'items': items,
                'items_count': len(items),
                'created_at': sale.created_at.isoformat(),
                'card_last_four': getattr(sale, 'card_last_four', None)  # For card payments
            })
        
        return jsonify({
            'success': True,
            'data': sales,
            'sales': sales,  # Keep for backward compatibility
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

@sales_bp.route('/sales/employee/<int:employee_id>', methods=['GET'])
@jwt_required()
def get_employee_sales(employee_id):
    """Get sales for a specific employee (admin/manager only)"""
    try:
        # Get current user info
        current_user = get_current_user_info()
        
        # Only admins and managers can view other employees' sales
        if not current_user['is_admin'] and current_user['role'] not in ['ADMIN', 'MANAGER']:
            return jsonify({'error': 'Access denied. Admin/Manager privileges required.'}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Build query for specific employee
        query = Sale.query.filter(Sale.employee_id == employee_id)
        
        # Add date range filter
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Sale.sale_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(Sale.sale_date < end_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Order by sale date (newest first)
        query = query.order_by(Sale.sale_date.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        sales = []
        for sale in pagination.items:
            # Get sale items with product details
            items = []
            if sale.items:
                for item in sale.items:
                    items.append({
                        'id': item.id,
                        'product_id': item.product_id,
                        'product_name': item.product.name if item.product else 'Unknown Product',
                        'quantity': item.quantity,
                        'unit_price': float(item.unit_price),
                        'total_price': float(item.total_price)
                    })
            
            sales.append({
                'id': sale.id,
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.name if sale.customer else None,
                'employee_id': sale.employee_id,
                'employee': {
                    'id': sale.employee.id if sale.employee else None,
                    'name': sale.employee.name if sale.employee else None,
                    'email': sale.employee.email if sale.employee else None
                },
                'total': float(sale.total_amount),
                'payment_method': sale.payment_method.value if sale.payment_method else None,
                'payment_reference': sale.payment_reference,
                'discount_amount': float(sale.discount_amount),
                'tax_amount': float(sale.tax_amount),
                'sale_date': sale.sale_date.isoformat(),
                'notes': sale.notes,
                'receipt_number': sale.receipt_number,
                'status': getattr(sale, 'status', 'completed'),
                'items': items,
                'items_count': len(items),
                'created_at': sale.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': sales,
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

@sales_bp.route('/sales/<int:sale_id>', methods=['GET'])
@jwt_required()
def get_sale(sale_id):
    """Get a specific sale by ID with detailed information"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        
        # Get sale items
        items = []
        if sale.items:
            for item in sale.items:
                items.append({
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'product_barcode': item.product.barcode if item.product else None,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'discount_amount': float(item.discount_amount)
                })
        
        return jsonify({
            'id': sale.id,
            'customer_id': sale.customer_id,
            'customer': {
                'id': sale.customer.id,
                'name': sale.customer.name,
                'email': sale.customer.email,
                'phone': sale.customer.phone
            } if sale.customer else None,
            'employee_id': sale.employee_id,
            'employee': {
                'id': sale.employee.id,
                'name': sale.employee.name,
                'username': sale.employee.username
            } if sale.employee else None,
            'total_amount': float(sale.total_amount),
            'payment_method': sale.payment_method.value if sale.payment_method else None,
            'payment_reference': sale.payment_reference,
            'discount_amount': float(sale.discount_amount),
            'tax_amount': float(sale.tax_amount),
            'sale_date': sale.sale_date.isoformat(),
            'notes': sale.notes,
            'receipt_number': sale.receipt_number,
            'items': items,
            'items_count': len(items),
            'created_at': sale.created_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales', methods=['POST'])
@jwt_required()
def create_sale():
    """Create a new sale"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['employee_id', 'total_amount', 'payment_method', 'items']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate items
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'Sale must have at least one item'}), 400
        
        # Initialize optional entities
        customer = None

        # Validate customer exists (if provided)
        customer_id = data.get('customer_id')
        if customer_id:
            customer = Customer.query.get(customer_id)
            if not customer:
                return jsonify({'error': 'Invalid customer_id'}), 400
        
        # Validate employee exists
        employee = User.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': 'Invalid employee_id'}), 400
        
        # Validate payment method
        try:
            payment_method = PaymentMethod(data['payment_method'])
        except ValueError:
            return jsonify({'error': 'Invalid payment_method'}), 400
        
        # Generate receipt number if not provided
        receipt_number = data.get('receipt_number')
        if not receipt_number:
            receipt_number = f"RCP{datetime.now().strftime('%Y%m%d%H%M%S')}{current_user_id}"
        
        # Check if receipt number already exists
        existing_sale = Sale.query.filter_by(receipt_number=receipt_number).first()
        if existing_sale:
            receipt_number += f"-{datetime.now().strftime('%f')}"  # Add microseconds
        
        # Create new sale
        sale = Sale(
            customer_id=customer_id,
            employee_id=data['employee_id'],
            total_amount=Decimal(str(data['total_amount'])),
            payment_method=payment_method,
            payment_reference=data.get('payment_reference'),
            discount_amount=Decimal(str(data.get('discount_amount', 0))),
            tax_amount=Decimal(str(data.get('tax_amount', 0))),
            notes=data.get('notes'),
            receipt_number=receipt_number
        )
        
        db.session.add(sale)
        db.session.flush()  # Get the sale ID
        
        # Create sale items and update product stock
        total_calculated = Decimal('0')
        for item_data in items:
            # Validate product exists
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'error': f'Invalid product_id: {item_data["product_id"]}'}), 400
            
            # Check stock availability
            if product.stock < item_data['quantity']:
                return jsonify({
                    'error': f'Insufficient stock for product {product.name}. Available: {product.stock}, Requested: {item_data["quantity"]}'
                }), 400
            
            # Calculate item total
            unit_price = Decimal(str(item_data['unit_price']))
            quantity = item_data['quantity']
            item_discount = Decimal(str(item_data.get('discount_amount', 0)))
            item_total = (unit_price * quantity) - item_discount
            
            # Create sale item
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data['product_id'],
                quantity=quantity,
                unit_price=unit_price,
                total_price=item_total,
                discount_amount=item_discount
            )
            
            db.session.add(sale_item)
            
            # Update product stock
            product.stock -= quantity
            
            total_calculated += item_total
        
        # Verify total amount matches calculated total
        if abs(total_calculated - sale.total_amount) > Decimal('0.01'):
            db.session.rollback()
            return jsonify({
                'error': f'Total amount mismatch. Calculated: {total_calculated}, Provided: {sale.total_amount}'
            }), 400
        
        # Update customer's total purchases if customer exists
        if customer:
            customer.total_purchases += sale.total_amount
            customer.last_purchase_date = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Sale created successfully',
            'sale': {
                'id': sale.id,
                'receipt_number': sale.receipt_number,
                'total_amount': float(sale.total_amount),
                'customer_name': customer.name if customer else None,
                'employee_name': employee.name,
                'payment_method': sale.payment_method.value,
                'sale_date': sale.sale_date.isoformat(),
                'items_count': len(items)
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/<int:sale_id>', methods=['PUT'])
@jwt_required()
def update_sale(sale_id):
    """Update an existing sale (limited fields only)"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        sale = Sale.query.get_or_404(sale_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Only allow updating certain fields
        allowed_fields = ['notes', 'payment_reference']
        updated_fields = []
        
        for field in allowed_fields:
            if field in data:
                setattr(sale, field, data[field])
                updated_fields.append(field)
        
        if updated_fields:
            db.session.commit()
            return jsonify({
                'message': f'Sale updated successfully. Updated fields: {", ".join(updated_fields)}',
                'sale': {
                    'id': sale.id,
                    'receipt_number': sale.receipt_number,
                    'notes': sale.notes,
                    'payment_reference': sale.payment_reference
                }
            }), 200
        else:
            return jsonify({'error': 'No valid fields to update'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/<int:sale_id>', methods=['DELETE'])
@jwt_required()
def delete_sale(sale_id):
    """Delete a sale (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        sale = Sale.query.get_or_404(sale_id)
        
        # Restore product stock
        for item in sale.items:
            product = Product.query.get(item.product_id)
            if product:
                product.stock += item.quantity
        
        # Update customer's total purchases if customer exists
        if sale.customer:
            sale.customer.total_purchases -= sale.total_amount
        
        # Delete sale (cascade will delete sale items)
        db.session.delete(sale)
        db.session.commit()
        
        return jsonify({
            'message': 'Sale deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/mpesa', methods=['POST'])
@jwt_required()
def create_sale_with_mpesa():
    """Create a new sale with M-Pesa payment integration"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields for M-Pesa payment
        required_fields = ['employee_id', 'total_amount', 'items', 'mpesa_phone_number']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Initialize optional entities
        customer = None
        
        # Validate customer exists (if provided)
        customer_id = data.get('customer_id')
        if customer_id:
            customer = Customer.query.get(customer_id)
            if not customer:
                return jsonify({'error': 'Invalid customer_id'}), 400
        
        # Validate employee exists
        employee = User.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': 'Invalid employee_id'}), 400
        
        # Validate items
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'Sale must have at least one item'}), 400
        
        # Generate receipt number
        receipt_number = data.get('receipt_number')
        if not receipt_number:
            receipt_number = f"RCP{datetime.now().strftime('%Y%m%d%H%M%S')}{current_user_id}"
        
        # Check if receipt number already exists
        existing_sale = Sale.query.filter_by(receipt_number=receipt_number).first()
        if existing_sale:
            receipt_number += f"-{datetime.now().strftime('%f')}"
        
        # Create new sale with pending status
        sale = Sale(
            customer_id=customer_id,
            employee_id=data['employee_id'],
            total_amount=Decimal(str(data['total_amount'])),
            payment_method=PaymentMethod.MPESA,
            payment_reference=None,  # Will be updated after M-Pesa payment
            discount_amount=Decimal(str(data.get('discount_amount', 0))),
            tax_amount=Decimal(str(data.get('tax_amount', 0))),
            notes=data.get('notes'),
            receipt_number=receipt_number
        )
        
        db.session.add(sale)
        db.session.flush()  # Get the sale ID
        
        # Create sale items and validate stock
        total_calculated = Decimal('0')
        sale_items = []
        
        for item_data in items:
            # Validate product exists
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'error': f'Invalid product_id: {item_data["product_id"]}'}), 400
            
            # Check stock availability
            if product.stock < item_data['quantity']:
                return jsonify({
                    'error': f'Insufficient stock for product {product.name}. Available: {product.stock}, Requested: {item_data["quantity"]}'
                }), 400
            
            # Calculate item total
            unit_price = Decimal(str(item_data['unit_price']))
            quantity = item_data['quantity']
            item_discount = Decimal(str(item_data.get('discount_amount', 0)))
            item_total = (unit_price * quantity) - item_discount
            
            # Create sale item (but don't commit yet)
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data['product_id'],
                quantity=quantity,
                unit_price=unit_price,
                total_price=item_total,
                discount_amount=item_discount
            )
            
            sale_items.append({
                'sale_item': sale_item,
                'product': product,
                'quantity': quantity
            })
            
            total_calculated += item_total
        
        # Verify total amount matches calculated total
        if abs(total_calculated - sale.total_amount) > Decimal('0.01'):
            db.session.rollback()
            return jsonify({
                'error': f'Total amount mismatch. Calculated: {total_calculated}, Provided: {sale.total_amount}'
            }), 400
        
        # Create M-Pesa transaction record
        mpesa_transaction = MpesaTransaction(
            transaction_type=MpesaTransactionType.STK_PUSH,
            amount=sale.total_amount,
            phone_number=data['mpesa_phone_number'],
            account_reference=receipt_number,
            transaction_desc=f"Payment for sale {receipt_number}",
            status=MpesaTransactionStatus.PENDING,
            sale_id=sale.id,
            user_id=current_user_id
        )
        
        db.session.add(mpesa_transaction)
        db.session.flush()  # Get the M-Pesa transaction ID
        
        # Generate unique transaction ID
        transaction_id = f"TXN{mpesa_transaction.id}{datetime.now().strftime('%Y%m%d%H%M%S')}"
        mpesa_transaction.transaction_id = transaction_id
        
        # Initiate STK Push
        response_data, status_code = initiate_stk_push(
            phone_number=data['mpesa_phone_number'],
            amount=float(sale.total_amount),
            order_id=mpesa_transaction.id,
            description=f"Payment for sale {receipt_number}"
        )
        
        if status_code == 200:
            # Update M-Pesa transaction with response
            mpesa_transaction.checkout_request_id = response_data.get('CheckoutRequestID')
            mpesa_transaction.merchant_request_id = response_data.get('MerchantRequestID')
            mpesa_transaction.mpesa_data = response_data
            
            # Add sale items to session (but don't update stock yet)
            for item_info in sale_items:
                db.session.add(item_info['sale_item'])
            
            # Update customer's total purchases if customer exists
            if customer:
                customer.total_purchases += sale.total_amount
                customer.last_purchase_date = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Sale created and M-Pesa payment initiated',
                'sale': {
                    'id': sale.id,
                    'receipt_number': sale.receipt_number,
                    'total_amount': float(sale.total_amount),
                    'customer_name': customer.name if customer else None,
                    'employee_name': employee.name,
                    'payment_method': sale.payment_method.value,
                    'sale_date': sale.sale_date.isoformat(),
                    'items_count': len(items)
                },
                'mpesa': {
                    'transaction_id': transaction_id,
                    'checkout_request_id': response_data.get('CheckoutRequestID'),
                    'merchant_request_id': response_data.get('MerchantRequestID'),
                    'customer_message': response_data.get('CustomerMessage')
                }
            }), 201
        else:
            # M-Pesa payment initiation failed
            mpesa_transaction.status = MpesaTransactionStatus.FAILED
            mpesa_transaction.result_desc = response_data.get('error', 'STK Push failed')
            mpesa_transaction.mpesa_data = response_data
            
            db.session.commit()
            
            return jsonify({
                'success': False,
                'error': response_data.get('error', 'Failed to initiate M-Pesa payment'),
                'sale_id': sale.id  # Sale is created but payment failed
            }), 400
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating sale with M-Pesa: {str(e)}")
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/<int:sale_id>/complete-mpesa', methods=['POST'])
@jwt_required()
def complete_mpesa_sale(sale_id):
    """Complete a sale after successful M-Pesa payment"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        
        # Find the associated M-Pesa transaction
        mpesa_transaction = MpesaTransaction.query.filter_by(
            sale_id=sale_id,
            status=MpesaTransactionStatus.COMPLETED
        ).first()
        
        if not mpesa_transaction:
            return jsonify({'error': 'No completed M-Pesa payment found for this sale'}), 400
        
        # Update sale with M-Pesa receipt number
        sale.payment_reference = mpesa_transaction.mpesa_receipt_number
        
        # Update product stock (this was deferred until payment completion)
        for item in sale.items:
            product = Product.query.get(item.product_id)
            if product:
                product.stock -= item.quantity
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sale completed successfully',
            'sale': {
                'id': sale.id,
                'receipt_number': sale.receipt_number,
                'mpesa_receipt': mpesa_transaction.mpesa_receipt_number,
                'total_amount': float(sale.total_amount)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error completing M-Pesa sale: {str(e)}")
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/stats', methods=['GET'])
@jwt_required()
def get_sales_stats():
    """Get sales statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        # Get date range from query params
        days = request.args.get('days', 30, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        # Total sales
        total_sales = Sale.query.count()
        sales_in_period = Sale.query.filter(Sale.sale_date >= start_date).count()
        
        # Revenue
        total_revenue = db.session.query(db.func.sum(Sale.total_amount)).scalar() or 0
        revenue_in_period = db.session.query(db.func.sum(Sale.total_amount)).filter(
            Sale.sale_date >= start_date
        ).scalar() or 0
        
        # Average sale amount
        avg_sale_amount = db.session.query(db.func.avg(Sale.total_amount)).scalar() or 0
        
        # Payment method distribution
        payment_stats = db.session.query(
            Sale.payment_method,
            db.func.count(Sale.id).label('count'),
            db.func.sum(Sale.total_amount).label('total')
        ).filter(Sale.sale_date >= start_date).group_by(Sale.payment_method).all()
        
        payment_data = [
            {
                'payment_method': stat.payment_method.value if stat.payment_method else None,
                'count': stat.count,
                'total': float(stat.total or 0)
            } for stat in payment_stats
        ]
        
        # Top employees by sales
        employee_stats = db.session.query(
            User.id,
            User.name,
            db.func.count(Sale.id).label('sales_count'),
            db.func.sum(Sale.total_amount).label('total_amount')
        ).join(Sale).filter(
            Sale.sale_date >= start_date
        ).group_by(User.id, User.name).order_by(
            db.func.sum(Sale.total_amount).desc()
        ).limit(5).all()
        
        employee_data = [
            {
                'employee_id': stat.id,
                'employee_name': stat.name,
                'sales_count': stat.sales_count,
                'total_amount': float(stat.total_amount or 0)
            } for stat in employee_stats
        ]
        
        # Daily sales for the period
        daily_sales = db.session.query(
            db.func.date(Sale.sale_date).label('date'),
            db.func.count(Sale.id).label('count'),
            db.func.sum(Sale.total_amount).label('total')
        ).filter(
            Sale.sale_date >= start_date
        ).group_by(
            db.func.date(Sale.sale_date)
        ).order_by(
            db.func.date(Sale.sale_date)
        ).all()
        
        daily_data = [
            {
                'date': stat.date.isoformat(),
                'sales_count': stat.count,
                'total_amount': float(stat.total or 0)
            } for stat in daily_sales
        ]
        
        return jsonify({
            'period_days': days,
            'total_sales': total_sales,
            'sales_in_period': sales_in_period,
            'total_revenue': float(total_revenue),
            'revenue_in_period': float(revenue_in_period),
            'average_sale_amount': float(avg_sale_amount),
            'payment_method_distribution': payment_data,
            'top_employees': employee_data,
            'daily_sales': daily_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/sales/receipt/<string:receipt_number>', methods=['GET'])
@jwt_required()
def get_sale_by_receipt(receipt_number):
    """Get sale by receipt number"""
    try:
        # Check if user has permission (admin/manager/employee)
        current_user_id = get_current_user()
        
        sale = Sale.query.filter_by(receipt_number=receipt_number).first()
        if not sale:
            return jsonify({'error': 'Sale not found'}), 404
        
        # Get sale items
        items = []
        if sale.items:
            for item in sale.items:
                items.append({
                    'id': item.id,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'product_barcode': item.product.barcode if item.product else None,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'discount_amount': float(item.discount_amount)
                })
        
        return jsonify({
            'id': sale.id,
            'receipt_number': sale.receipt_number,
            'customer_name': sale.customer.name if sale.customer else 'Walk-in Customer',
            'employee_name': sale.employee.name if sale.employee else 'Unknown Employee',
            'total_amount': float(sale.total_amount),
            'payment_method': sale.payment_method.value if sale.payment_method else None,
            'payment_reference': sale.payment_reference,
            'discount_amount': float(sale.discount_amount),
            'tax_amount': float(sale.tax_amount),
            'sale_date': sale.sale_date.isoformat(),
            'notes': sale.notes,
            'items': items
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
