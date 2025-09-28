from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Category
from datetime import datetime

categories_bp = Blueprint('categories', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@categories_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """Get all categories with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        # Build query
        query = Category.query
        
        # Add search filter
        if search:
            query = query.filter(
                Category.name.contains(search) | 
                Category.description.contains(search)
            )
        
        # Add active filter
        if active_only:
            query = query.filter(Category.is_active == True)
        
        # Order by name
        query = query.order_by(Category.name)
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        categories = []
        for category in pagination.items:
            categories.append({
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'image_url': category.image_url,
                'is_active': category.is_active,
                'product_count': len(category.products) if category.products else 0,
                'created_at': category.created_at.isoformat() if category.created_at else None,
                'updated_at': category.updated_at.isoformat() if category.updated_at else None
            })
        
        return jsonify({
            'categories': categories,
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

@categories_bp.route('/categories/<int:category_id>', methods=['GET'])
@jwt_required()
def get_category(category_id):
    """Get a specific category by ID"""
    try:
        category = Category.query.get_or_404(category_id)
        
        return jsonify({
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'image_url': category.image_url,
            'is_active': category.is_active,
            'products': [
                {
                    'id': product.id,
                    'name': product.name,
                    'price': float(product.price),
                    'stock': product.stock,
                    'status': product.status
                } for product in category.products
            ] if category.products else [],
            'created_at': category.created_at.isoformat() if category.created_at else None,
            'updated_at': category.updated_at.isoformat() if category.updated_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Create a new category"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        # Add permission check here if needed
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400
        
        # Check if category name already exists
        existing_category = Category.query.filter_by(name=data['name']).first()
        if existing_category:
            return jsonify({'error': 'Category with this name already exists'}), 400
        
        # Create new category
        category = Category(
            name=data['name'],
            description=data.get('description', ''),
            image_url=data.get('image_url'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'message': 'Category created successfully',
            'category': {
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'image_url': category.image_url,
                'is_active': category.is_active,
                'created_at': category.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
def update_category(category_id):
    """Update an existing category"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        category = Category.query.get_or_404(category_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update fields
        if 'name' in data:
            # Check if new name already exists (excluding current category)
            existing_category = Category.query.filter(
                Category.name == data['name'],
                Category.id != category_id
            ).first()
            if existing_category:
                return jsonify({'error': 'Category with this name already exists'}), 400
            category.name = data['name']
        
        if 'description' in data:
            category.description = data['description']
        
        if 'image_url' in data:
            category.image_url = data['image_url']
        
        if 'is_active' in data:
            category.is_active = data['is_active']
        
        category.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Category updated successfully',
            'category': {
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'image_url': category.image_url,
                'is_active': category.is_active,
                'updated_at': category.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    """Delete a category (soft delete by setting is_active to False)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        category = Category.query.get_or_404(category_id)
        
        # Check if category has products
        if category.products:
            return jsonify({
                'error': 'Cannot delete category with existing products. Please reassign or delete products first.'
            }), 400
        
        # Soft delete by setting is_active to False
        category.is_active = False
        category.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Category deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/categories/<int:category_id>/activate', methods=['PUT'])
@jwt_required()
def activate_category(category_id):
    """Activate a deactivated category"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        category = Category.query.get_or_404(category_id)
        
        category.is_active = True
        category.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Category activated successfully',
            'category': {
                'id': category.id,
                'name': category.name,
                'is_active': category.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/categories/stats', methods=['GET'])
@jwt_required()
def get_category_stats():
    """Get category statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        total_categories = Category.query.count()
        active_categories = Category.query.filter(Category.is_active == True).count()
        inactive_categories = total_categories - active_categories
        
        # Categories with products
        categories_with_products = db.session.query(Category).join(Category.products).distinct().count()
        
        # Top categories by product count
        top_categories = db.session.query(
            Category.id,
            Category.name,
            db.func.count(Category.products).label('product_count')
        ).outerjoin(Category.products).group_by(
            Category.id, Category.name
        ).order_by(
            db.func.count(Category.products).desc()
        ).limit(5).all()
        
        top_categories_data = [
            {
                'id': cat.id,
                'name': cat.name,
                'product_count': cat.product_count
            } for cat in top_categories
        ]
        
        return jsonify({
            'total_categories': total_categories,
            'active_categories': active_categories,
            'inactive_categories': inactive_categories,
            'categories_with_products': categories_with_products,
            'categories_without_products': total_categories - categories_with_products,
            'top_categories': top_categories_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
