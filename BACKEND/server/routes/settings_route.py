from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import SystemSettings
from datetime import datetime
import json

settings_bp = Blueprint('settings', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@settings_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get all system settings"""
    try:
        # Get query parameters
        public_only = request.args.get('public_only', 'false').lower() == 'true'
        
        # Build query
        query = SystemSettings.query
        
        if public_only:
            query = query.filter(SystemSettings.is_public == True)
        
        # Order by key
        query = query.order_by(SystemSettings.key)
        
        settings = []
        for setting in query.all():
            # Parse value based on data type
            value = setting.value
            if setting.data_type == 'json':
                try:
                    value = json.loads(setting.value)
                except json.JSONDecodeError:
                    value = setting.value
            elif setting.data_type == 'number':
                try:
                    value = float(setting.value)
                except ValueError:
                    value = setting.value
            elif setting.data_type == 'boolean':
                value = setting.value.lower() in ('true', '1', 'yes', 'on')
            
            settings.append({
                'id': setting.id,
                'key': setting.key,
                'value': value,
                'description': setting.description,
                'data_type': setting.data_type,
                'is_public': setting.is_public,
                'updated_at': setting.updated_at.isoformat() if setting.updated_at else None
            })
        
        return jsonify({
            'settings': settings
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/<string:key>', methods=['GET'])
@jwt_required()
def get_setting(key):
    """Get a specific setting by key"""
    try:
        setting = SystemSettings.query.filter_by(key=key).first()
        if not setting:
            return jsonify({'error': 'Setting not found'}), 404
        
        # Parse value based on data type
        value = setting.value
        if setting.data_type == 'json':
            try:
                value = json.loads(setting.value)
            except json.JSONDecodeError:
                value = setting.value
        elif setting.data_type == 'number':
            try:
                value = float(setting.value)
            except ValueError:
                value = setting.value
        elif setting.data_type == 'boolean':
            value = setting.value.lower() in ('true', '1', 'yes', 'on')
        
        return jsonify({
            'id': setting.id,
            'key': setting.key,
            'value': value,
            'description': setting.description,
            'data_type': setting.data_type,
            'is_public': setting.is_public,
            'updated_at': setting.updated_at.isoformat() if setting.updated_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings', methods=['POST'])
@jwt_required()
def create_setting():
    """Create a new system setting (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['key', 'value']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if setting already exists
        existing_setting = SystemSettings.query.filter_by(key=data['key']).first()
        if existing_setting:
            return jsonify({'error': 'Setting with this key already exists'}), 400
        
        # Determine data type if not provided
        data_type = data.get('data_type', 'string')
        value = data['value']
        
        # Convert value to string for storage
        if data_type == 'json':
            if not isinstance(value, (dict, list)):
                return jsonify({'error': 'Value must be a valid JSON object or array'}), 400
            value = json.dumps(value)
        elif data_type == 'boolean':
            value = str(bool(value)).lower()
        elif data_type == 'number':
            try:
                value = str(float(value))
            except (ValueError, TypeError):
                return jsonify({'error': 'Value must be a valid number'}), 400
        else:
            value = str(value)
        
        # Create setting
        setting = SystemSettings(
            key=data['key'],
            value=value,
            description=data.get('description', ''),
            data_type=data_type,
            is_public=data.get('is_public', False)
        )
        
        db.session.add(setting)
        db.session.commit()
        
        return jsonify({
            'message': 'Setting created successfully',
            'setting': {
                'id': setting.id,
                'key': setting.key,
                'value': data['value'],  # Return original value
                'description': setting.description,
                'data_type': setting.data_type,
                'is_public': setting.is_public
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/<string:key>', methods=['PUT'])
@jwt_required()
def update_setting(key):
    """Update an existing system setting (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        setting = SystemSettings.query.filter_by(key=key).first()
        if not setting:
            return jsonify({'error': 'Setting not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update fields
        if 'value' in data:
            data_type = data.get('data_type', setting.data_type)
            value = data['value']
            
            # Convert value to string for storage
            if data_type == 'json':
                if not isinstance(value, (dict, list)):
                    return jsonify({'error': 'Value must be a valid JSON object or array'}), 400
                value = json.dumps(value)
            elif data_type == 'boolean':
                value = str(bool(value)).lower()
            elif data_type == 'number':
                try:
                    value = str(float(value))
                except (ValueError, TypeError):
                    return jsonify({'error': 'Value must be a valid number'}), 400
            else:
                value = str(value)
            
            setting.value = value
        
        if 'data_type' in data:
            setting.data_type = data['data_type']
        
        if 'description' in data:
            setting.description = data['description']
        
        if 'is_public' in data:
            setting.is_public = data['is_public']
        
        setting.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Parse value for response
        response_value = setting.value
        if setting.data_type == 'json':
            try:
                response_value = json.loads(setting.value)
            except json.JSONDecodeError:
                response_value = setting.value
        elif setting.data_type == 'number':
            try:
                response_value = float(setting.value)
            except ValueError:
                response_value = setting.value
        elif setting.data_type == 'boolean':
            response_value = setting.value.lower() in ('true', '1', 'yes', 'on')
        
        return jsonify({
            'message': 'Setting updated successfully',
            'setting': {
                'id': setting.id,
                'key': setting.key,
                'value': response_value,
                'description': setting.description,
                'data_type': setting.data_type,
                'is_public': setting.is_public,
                'updated_at': setting.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/<string:key>', methods=['DELETE'])
@jwt_required()
def delete_setting(key):
    """Delete a system setting (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        setting = SystemSettings.query.filter_by(key=key).first()
        if not setting:
            return jsonify({'error': 'Setting not found'}), 404
        
        db.session.delete(setting)
        db.session.commit()
        
        return jsonify({
            'message': 'Setting deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/bulk-update', methods=['PUT'])
@jwt_required()
def bulk_update_settings():
    """Update multiple settings at once (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data or 'settings' not in data:
            return jsonify({'error': 'Settings data is required'}), 400
        
        updated_settings = []
        errors = []
        
        for setting_data in data['settings']:
            if 'key' not in setting_data:
                errors.append('Key is required for each setting')
                continue
            
            key = setting_data['key']
            setting = SystemSettings.query.filter_by(key=key).first()
            
            if not setting:
                errors.append(f'Setting with key "{key}" not found')
                continue
            
            try:
                # Update fields
                if 'value' in setting_data:
                    data_type = setting_data.get('data_type', setting.data_type)
                    value = setting_data['value']
                    
                    # Convert value to string for storage
                    if data_type == 'json':
                        if not isinstance(value, (dict, list)):
                            errors.append(f'Value for "{key}" must be a valid JSON object or array')
                            continue
                        value = json.dumps(value)
                    elif data_type == 'boolean':
                        value = str(bool(value)).lower()
                    elif data_type == 'number':
                        try:
                            value = str(float(value))
                        except (ValueError, TypeError):
                            errors.append(f'Value for "{key}" must be a valid number')
                            continue
                    else:
                        value = str(value)
                    
                    setting.value = value
                
                if 'data_type' in setting_data:
                    setting.data_type = setting_data['data_type']
                
                if 'description' in setting_data:
                    setting.description = setting_data['description']
                
                if 'is_public' in setting_data:
                    setting.is_public = setting_data['is_public']
                
                setting.updated_at = datetime.utcnow()
                updated_settings.append(key)
                
            except Exception as e:
                errors.append(f'Error updating "{key}": {str(e)}')
        
        if errors:
            db.session.rollback()
            return jsonify({'error': 'Some settings failed to update', 'details': errors}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(updated_settings)} settings updated successfully',
            'updated_settings': updated_settings
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
