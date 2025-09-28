from flask import Blueprint, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import  jwt_required, get_jwt_identity, create_access_token, create_refresh_token
from datetime import datetime
from extensions import db
from models import User

# Blueprint Configuration
users_bp = Blueprint('auth', __name__)




# Utility function to retrieve the current logged-in user based on the JWT identity. and get the jwt_identity tokens
def _extract_user_id(identity):
    """Support both int identity and dict identity with {'id': ...}."""
    if identity is None:
        return None
    if isinstance(identity, dict):
        return identity.get('id')
    return identity


def get_current_user():
    current_identity = get_jwt_identity()
    user_id = _extract_user_id(current_identity)
    if not user_id:
        return None
    return db.session.get(User, user_id)


@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get current user profile with role information"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Determine user role and permissions
        user_role = "EMPLOYEE"  # Default role
        is_admin_flag = False
        
        if hasattr(user, 'role') and user.role:
            user_role = str(user.role).upper()
            if user_role in ['ADMIN', 'MANAGER']:
                is_admin_flag = True
        
        # Fallback to is_admin boolean field
        if user.is_admin:
            is_admin_flag = True
            if user_role == "EMPLOYEE":
                user_role = "ADMIN"
        
        # Define role-based permissions
        permissions = {
            'can_view_dashboard': is_admin_flag or user_role in ['MANAGER'],
            'can_manage_users': user_role == 'ADMIN',
            'can_manage_products': is_admin_flag or user_role in ['MANAGER'],
            'can_process_sales': True,  # All users can process sales
            'can_view_reports': is_admin_flag or user_role in ['MANAGER'],
            'can_manage_inventory': is_admin_flag or user_role in ['MANAGER'],
        }
        
        return jsonify({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.name,
                "role": user_role,
                "is_admin": is_admin_flag,
                "permissions": permissions,
                "last_login": user.last_login.isoformat() if user.last_login else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@users_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected_route():
    """Legacy protected route - kept for compatibility"""
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    return jsonify({
        "message": f"Welcome, {user.username}! You are authorized to access this route.",
        "is_admin": user.is_admin
    })

@users_bp.route('/debug/users', methods=['GET'])
def debug_users():
    """Debug endpoint to check users in database"""
    try:
        users = User.query.all()
        
        users_data = []
        for user in users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': str(user.role) if user.role else None,
                'is_admin': user.is_admin,
                'has_password_hash': bool(user.password_hash)
            }
            users_data.append(user_data)
            
        return jsonify({
            'total_users': len(users_data),
            'users': users_data
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/debug/test', methods=['GET'])
def debug_test():
    """Simple test endpoint"""
    return jsonify({'message': 'Debug test endpoint working'}), 200


@users_bp.route("/refresh", methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    # Refresh token is required to generate new tokens
    current_identity = get_jwt_identity()
    user_id = _extract_user_id(current_identity)
    user = User.query.get(user_id) if user_id else None
    new_access_token = create_access_token(identity={
        "id": user_id,
        "is_admin": bool(user.is_admin) if user else False
    })
    return jsonify ({'access_token': new_access_token}), 200

@users_bp.route('/users', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_users():
    """Get all users (admin only)"""
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response, 200
    
    try:
        # Check if current user is admin
        current_user = get_current_user()
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get query parameters for pagination and filtering
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        # Build query
        query = User.query
        
        # Add search filter if provided
        if search:
            query = query.filter(
                User.username.contains(search) | 
                User.email.contains(search)
            )
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        users = []
        for user in pagination.items:
            users.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        response = jsonify({
            'users': users,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#####################################################################################USER LOGIN##################################################################################################
@users_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"message": "Email and password are required"}), 400

        email = data['email']
        password = data['password']

        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({"message": "Invalid email or password"}), 401
        
        password_check = user.check_password(password)
        
        if not password_check:
            return jsonify({"message": "Invalid email or password"}), 401

        # Update last_login timestamp and ensure admin role is set correctly
        try:
            user.last_login = datetime.utcnow()
            
            # If user has is_admin=True but role is not ADMIN, update it
            if user.is_admin and (not user.role or str(user.role) != 'ADMIN'):
                user.role = 'ADMIN'
            
            db.session.commit()
        except Exception as e:
            db.session.rollback()

        # Build identity payload (kept minimal) and include admin claims
        identity_payload = {"id": user.id}
        
        # Check if user is admin based on database role or is_admin flag
        is_admin_flag = False
        user_role = "USER"
        
        # Check the role enum first (primary method)
        if hasattr(user, 'role') and user.role:
            if str(user.role).upper() == 'ADMIN':
                is_admin_flag = True
                user_role = "ADMIN"
            elif str(user.role).upper() == 'MANAGER':
                is_admin_flag = True
                user_role = "MANAGER"
            elif str(user.role).upper() == 'STAFF':
                user_role = "STAFF"
        
        # Fallback to is_admin boolean field if role enum is not set
        if not is_admin_flag and user.is_admin:
            is_admin_flag = True
            user_role = "ADMIN"
        
        additional_claims = {
            "role": user_role,
            "is_admin": is_admin_flag
        }

        access_token = create_access_token(identity=identity_payload, additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=identity_payload, additional_claims=additional_claims)

        # Define redirect URL based on role
        redirect_url = "/pos"  # Default for employees
        if user_role in ['ADMIN', 'MANAGER']:
            redirect_url = "/admin"
        
        # Define role-based permissions
        permissions = {
            'can_view_dashboard': is_admin_flag or user_role in ['MANAGER'],
            'can_manage_users': user_role == 'ADMIN',
            'can_manage_products': is_admin_flag or user_role in ['MANAGER'],
            'can_process_sales': True,  # All users can process sales
            'can_view_reports': is_admin_flag or user_role in ['MANAGER'],
            'can_manage_inventory': is_admin_flag or user_role in ['MANAGER'],
        }

        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "message": "Login successful",
            "redirect_url": redirect_url,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
                "is_admin": is_admin_flag,
                "role": user_role,
                "permissions": permissions
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"message": "Login failed due to server error"}), 500   



#####################################################################################LOGOUT##################################################################################################
@users_bp.route('/logout', methods=['OPTIONS'])
def logout_options():
    """Handle CORS preflight request for logout"""
    response = make_response(jsonify({"message": "OK"}), 200)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@users_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user and clear session"""
    try:
        current_user_id = get_jwt_identity()
        if isinstance(current_user_id, dict):
            user_id = current_user_id.get('id')
        else:
            user_id = current_user_id
            
        if not user_id:
            return jsonify({"error": "Invalid user identity"}), 400
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Log the logout action (we can add last_logout field later if needed)
        # For now, just return success - the JWT token will be invalidated on the client side
        
        return jsonify({
            "message": "Logout successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.name
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to logout: {str(e)}"}), 500

#####################################################################################ADMIN ROLE UPDATE##################################################################################################
@users_bp.route('/admin/update-role', methods=['POST'])
def update_admin_role():
    """Update admin user role - for fixing existing admin users"""
    try:
        data = request.get_json()
        email = data.get('email')
        new_role = data.get('role', 'ADMIN')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Update role
        if new_role.upper() == 'ADMIN':
            user.role = 'ADMIN'
            user.is_admin = True
        elif new_role.upper() == 'MANAGER':
            user.role = 'MANAGER'
            user.is_admin = True
        elif new_role.upper() == 'STAFF':
            user.role = 'STAFF'
            user.is_admin = False
        else:
            user.role = 'USER'
            user.is_admin = False
            
        db.session.commit()
        
        return jsonify({
            "message": f"User role updated to {new_role}",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": str(user.role),
                "is_admin": user.is_admin
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update role: {str(e)}"}), 500

#####################################################################################USER REGISTRATION##################################################################################################
@users_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing required fields"}), 400

    username = data['username']
    email = data['email']
    password = data['password']
    is_admin = data.get('is_admin', False)  # Optional — allow admin creation if set

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    password_hash = generate_password_hash(password)

    user = User(username=username, email=email, password_hash=password_hash, is_admin=is_admin)
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "An error occurred while creating the user", "details": str(e)}), 500

@users_bp.route('/admin/customers', methods=['GET'])
@jwt_required()
def get_customers():
    """Admin endpoint to get all customers with filtering and pagination"""
    try:
        # Check if current user is admin
        current_user = get_current_user()
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get query parameters for pagination and filtering
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        
        # Build query - only get non-admin users
        query = User.query.filter(User.is_admin == False)
        
        # Add search filter if provided
        if search:
            query = query.filter(
                db.or_(
                    User.username.contains(search),
                    User.email.contains(search)
                )
            )
        
        # Add status filter if provided
        if status_filter == 'active':
            # Users with recent activity (orders in last 30 days)
            from datetime import datetime, timedelta
            from models import Order
            thirty_days_ago = datetime.now() - timedelta(days=30)
            active_user_ids = db.session.query(Order.user_id).filter(
                Order.order_date >= thirty_days_ago
            ).distinct().subquery()
            query = query.filter(User.id.in_(active_user_ids))
        elif status_filter == 'inactive':
            # Users with no orders or old orders
            from datetime import datetime, timedelta
            from models import Order
            thirty_days_ago = datetime.now() - timedelta(days=30)
            active_user_ids = db.session.query(Order.user_id).filter(
                Order.order_date >= thirty_days_ago
            ).distinct().subquery()
            query = query.filter(~User.id.in_(active_user_ids))
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        customers = []
        for user in pagination.items:
            # Get customer statistics
            from models import Order, Payment
            order_count = Order.query.filter_by(user_id=user.id).count()
            total_spent = db.session.query(db.func.sum(Order.total_amount)).filter(
                Order.user_id == user.id,
                Order.order_status == 'COMPLETED'
            ).scalar() or 0
            
            last_order = Order.query.filter_by(user_id=user.id).order_by(
                Order.order_date.desc()
            ).first()
            
            customer_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'order_count': order_count,
                'total_spent': float(total_spent),
                'last_order_date': last_order.order_date.isoformat() if last_order else None,
                'status': 'active' if order_count > 0 else 'inactive'
            }
            customers.append(customer_data)
        
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

@users_bp.route('/admin/customers/stats', methods=['GET'])
@jwt_required()
def get_customer_stats():
    """Admin endpoint to get customer statistics"""
    try:
        # Check if current user is admin
        current_user = get_current_user()
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        from models import Order
        from datetime import datetime, timedelta
        
        # Get date range from query params
        days = request.args.get('days', 30, type=int)
        from_date = datetime.now() - timedelta(days=days)
        
        # Get all customers (non-admin users)
        total_customers = User.query.filter(User.is_admin == False).count()
        
        # Get customers with orders in date range
        active_customers = db.session.query(Order.user_id).filter(
            Order.order_date >= from_date
        ).distinct().count()
        
        # Get new customers in date range
        new_customers = User.query.filter(
            User.is_admin == False,
            User.created_at >= from_date
        ).count()
        
        # Get top customers by spending
        top_customers = db.session.query(
            User.id,
            User.username,
            User.email,
            db.func.sum(Order.total_amount).label('total_spent'),
            db.func.count(Order.order_id).label('order_count')
        ).join(Order).filter(
            User.is_admin == False,
            Order.order_status == 'COMPLETED'
        ).group_by(User.id).order_by(
            db.func.sum(Order.total_amount).desc()
        ).limit(10).all()
        
        top_customers_data = []
        for customer in top_customers:
            top_customers_data.append({
                'id': customer.id,
                'username': customer.username,
                'email': customer.email,
                'total_spent': float(customer.total_spent),
                'order_count': customer.order_count
            })
        
        return jsonify({
            'total_customers': total_customers,
            'active_customers': active_customers,
            'new_customers': new_customers,
            'inactive_customers': total_customers - active_customers,
            'top_customers': top_customers_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/admin/customers/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_customer_details(customer_id):
    """Admin endpoint to get detailed customer information"""
    try:
        # Check if current user is admin
        current_user = get_current_user()
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        user = User.query.get(customer_id)
        if not user:
            return jsonify({'error': 'Customer not found'}), 404
        
        if user.is_admin:
            return jsonify({'error': 'Cannot view admin user details'}), 403
        
        # Get customer orders
        from models import Order, OrderItem, Product
        orders = Order.query.filter_by(user_id=user.id).order_by(
            Order.order_date.desc()
        ).all()
        
        orders_data = []
        for order in orders:
            order_items = []
            for item in order.order_items:
                product = Product.query.get(item.product_id)
                order_items.append({
                    'product_id': item.product_id,
                    'product_name': product.product_name if product else 'Unknown Product',
                    'quantity': item.quantity,
                    'price': item.price,
                    'shipping_status': item.shipping_status.value if item.shipping_status else None
                })
            
            orders_data.append({
                'order_id': order.order_id,
                'order_date': order.order_date.isoformat() if order.order_date else None,
                'total_amount': order.total_amount,
                'order_status': order.order_status.value if order.order_status else None,
                'shipping_address': order.shipping_address,
                'items': order_items
            })
        
        # Get payment methods
        payment_methods = []
        for pm in user.payment_method:
            payment_methods.append({
                'id': pm.payment_method_id,
                'card_type': pm.card_type,
                'card_number': pm.card_number[-4:],  # Only show last 4 digits
                'expiration_date': pm.expiration_date
            })
        
        customer_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'total_orders': len(orders),
            'total_spent': sum(order.total_amount for order in orders if order.order_status == 'COMPLETED'),
            'orders': orders_data,
            'payment_methods': payment_methods
        }
        
        return jsonify(customer_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500