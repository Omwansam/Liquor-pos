from flask import Blueprint, request, jsonify, url_for,current_app
from models import ProductImage, Product
from utils.images import save_product_image, delete_image_file, allowed_file
from extensions import db
import os
from flask_jwt_extended import jwt_required

# Blueprint Configuration
product_image_bp = Blueprint('product_images', __name__)
MAX_IMAGES_PER_PRODUCT = 10

@product_image_bp.route('/<int:image_id>', methods=['GET'])

def get_product_image_url(image_id):
    """Get details of a specific product image.
    ---
    tags:
    - Product Images
    parameters:
    - name: image_id
        in: path
        type: integer
        required: true
    responses:
    200:
        description: Image details
    404:
        description: Image not found
    """

    image = ProductImage.query.get_or_404(image_id)
    return jsonify({
        'image_id': image.image_id,
        'product_id': image.product_id,
        'image_url': url_for('static', filename=image.image_url, _external=True),
        'is_primary': image.is_primary,
    }), 200


@product_image_bp.route('/product/<int:product_id>', methods=['POST'])

@jwt_required()
def upload_product_image(product_id):
    """Handles product image uploads."""
    product = Product.query.get_or_404(product_id)

    # Check image limit
    current_count = ProductImage.query.filter_by(product_id=product_id).count()
    if current_count >= MAX_IMAGES_PER_PRODUCT:
        return jsonify({'error': f'Maximum {MAX_IMAGES_PER_PRODUCT} images per product reached'}), 400

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # """Save the image to filesystem"""
    image_path = save_product_image(file, product_id)
    if not image_path:
        return jsonify({'error': 'Image upload failed'}), 500
    
    is_primary = request.form.get('is_primary', 'false').lower() == 'true'

    try:    
    
    # Handle primary image assignment only if is_primary is True
        if is_primary:
            ProductImage.query.filter_by(
                product_id=product_id,
                is_primary=True
            ).update({'is_primary': False})
    
        new_image = ProductImage(
            image_url=image_path,
            is_primary=is_primary,
            product_id=product_id
        )
        db.session.add(new_image)
        db.session.commit()
    
        return jsonify({
            'message': 'Product image uploaded successfully', 
            'image_id': new_image.image_id,
    'image_url': url_for('static', filename=image_path,  _external=True),
            'is_primary': is_primary,
            'image_count': current_count + 1
        }), 201

    except Exception as e:
            # Clean up if DB operation fails
            delete_image_file(image_path)
            current_app.logger.error(f"Failed to save image: {str(e)}")
            return jsonify({'error': 'Database operation failed'}), 500

# Update a product image

@product_image_bp.route('/<int:image_id>', methods=['PUT'])
@jwt_required()
def update_product_image(image_id):
    """Update a product image.
    ---
    tags:
    - Product Images
    parameters:
    - name: image_id
        in: path
        type: integer
        required: true
    - name: is_primary
        in: query
        type: boolean
        description: Set as primary image
    responses:
    200:
        description: Image updated successfully
    404:
        description: Image not found
    """
    image = ProductImage.query.get_or_404(image_id)
    data = request.get_json()
    try:
    # Update the primary status if provided
        if 'is_primary' in data:
        
            if data['is_primary']:
            # Unset current primary image
                ProductImage.query.filter_by(
                    product_id=image.product_id,
                    is_primary=True
                ).update({'is_primary': False})
            image.is_primary = data['is_primary']

        db.session.commit()
        return jsonify({
            'message': 'Image updated successfully', 
            'is_primary': image.is_primary
        }), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to update image: {str(e)}")
        return jsonify({'error': 'Database operation failed'}), 500

# Set a product image as primary

"""@product_image_bp.route('/<int:image_id>/primary', methods=['PUT'])
@jwt_required()
def set_product_image_as_primary(image_id):
    Set a product image as primary.
    ---
    tags:
    - Product Images
    parameters:
    - name: image_id
        in: path
        type: integer
        required: true
    responses:
    200:
        description: Image set as primary successfully
    404:
        description: Image not found
    
    image = ProductImage.query.get_or_404(image_id)
    # Delete any existing primary image for this product
    ProductImage.query.filter_by(product_id=image.product_id, is_primary=True).update({'is_primary': False})
    
    # Set the current image as primary
    image.is_primary = True
    db.session.commit()
    return jsonify({'message': 'Image set as primary successfully', 'is_primary': image.is_primary}), 200
    """

# Delete a product image
@product_image_bp.route('/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_product_image(image_id):
    """Delete a product image.
    ---
    tags:
    - Product Images
    parameters:
    - name: image_id
        in: path
        type: integer
        required: true
    responses:
    200:
        description: Image deleted successfully
    404:
        description: Image not found
    """
    image = ProductImage.query.get_or_404(image_id)
    was_primary = image.is_primary
    product_id = image.product_id
    image_url = image.image_url


    # Delete the image file
    if not delete_image_file(image.image_url):
        current_app.logger.error(f"Failed to delete image file: {image.image_url}")
    
    try:

        # Delete the image file
        if not delete_image_file(image.image_url):
            current_app.logger.error(f"Failed to delete image file: {image.image_url}")
    
    # Delete from database
        db.session.delete(image)
        db.session.commit()

        
    
    
    # If we deleted the primary image, assign a new one
        if was_primary:
            new_primary = ProductImage.query.filter_by(
                product_id=product_id
            ).first()
            if new_primary:
                new_primary.is_primary = True
                db.session.commit()
    
        return jsonify({
            'message': 'Product image deleted successfully',
            'new_primary_assigned': was_primary and new_primary is not None
        }), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to delete image: {str(e)}")
        return jsonify({'error': 'Database operation failed'}), 500
