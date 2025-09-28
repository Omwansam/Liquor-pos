from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Notification, User, NotificationType
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@notifications_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for current user and system-wide notifications"""
    try:
        current_user_id = get_current_user()
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        notification_type = request.args.get('type', '')
        
        # Build query for user's notifications and system-wide notifications
        query = Notification.query.filter(
            db.or_(
                Notification.user_id == current_user_id,
                Notification.user_id.is_(None)  # System-wide notifications
            )
        )
        
        # Add filters
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        if notification_type:
            try:
                query = query.filter(Notification.notification_type == NotificationType(notification_type))
            except ValueError:
                return jsonify({'error': 'Invalid notification type'}), 400
        
        # Order by created date (newest first)
        query = query.order_by(Notification.created_at.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        notifications = []
        for notification in pagination.items:
            notifications.append({
                'id': notification.id,
                'user_id': notification.user_id,
                'title': notification.title,
                'message': notification.message,
                'notification_type': notification.notification_type.value if notification.notification_type else None,
                'is_read': notification.is_read,
                'action_url': notification.action_url,
                'created_at': notification.created_at.isoformat()
            })
        
        # Get unread count
        unread_count = Notification.query.filter(
            db.or_(
                Notification.user_id == current_user_id,
                Notification.user_id.is_(None)
            ),
            Notification.is_read == False
        ).count()
        
        return jsonify({
            'notifications': notifications,
            'unread_count': unread_count,
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

@notifications_bp.route('/notifications/<int:notification_id>', methods=['GET'])
@jwt_required()
def get_notification(notification_id):
    """Get a specific notification by ID"""
    try:
        current_user_id = get_current_user()
        
        notification = Notification.query.get_or_404(notification_id)
        
        # Check if user has access to this notification
        if notification.user_id and notification.user_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'id': notification.id,
            'user_id': notification.user_id,
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type.value if notification.notification_type else None,
            'is_read': notification.is_read,
            'action_url': notification.action_url,
            'created_at': notification.created_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications', methods=['POST'])
@jwt_required()
def create_notification():
    """Create a new notification (admin/manager only)"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['title', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate notification type
        notification_type = NotificationType.INFO  # Default
        if data.get('notification_type'):
            try:
                notification_type = NotificationType(data['notification_type'])
            except ValueError:
                return jsonify({'error': 'Invalid notification_type'}), 400
        
        # Validate user_id if provided
        user_id = data.get('user_id')
        if user_id:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'Invalid user_id'}), 400
        
        # Create notification
        notification = Notification(
            user_id=user_id,  # None for system-wide notifications
            title=data['title'],
            message=data['message'],
            notification_type=notification_type,
            action_url=data.get('action_url')
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'message': 'Notification created successfully',
            'notification': {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'notification_type': notification.notification_type.value,
                'user_id': notification.user_id,
                'created_at': notification.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        current_user_id = get_current_user()
        
        notification = Notification.query.get_or_404(notification_id)
        
        # Check if user has access to this notification
        if notification.user_id and notification.user_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({
            'message': 'Notification marked as read',
            'notification': {
                'id': notification.id,
                'is_read': notification.is_read
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for current user"""
    try:
        current_user_id = get_current_user()
        
        # Mark user's notifications and system-wide notifications as read
        updated_count = Notification.query.filter(
            db.or_(
                Notification.user_id == current_user_id,
                Notification.user_id.is_(None)
            ),
            Notification.is_read == False
        ).update({'is_read': True})
        
        db.session.commit()
        
        return jsonify({
            'message': f'{updated_count} notifications marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Delete a notification (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        notification = Notification.query.get_or_404(notification_id)
        
        # Check if user has access to this notification
        if notification.user_id and notification.user_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({
            'message': 'Notification deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/stats', methods=['GET'])
@jwt_required()
def get_notification_stats():
    """Get notification statistics"""
    try:
        # Check if user has permission (admin/manager only)
        current_user_id = get_current_user()
        
        # Total notifications
        total_notifications = Notification.query.count()
        
        # Unread notifications
        unread_notifications = Notification.query.filter(Notification.is_read == False).count()
        
        # Notification type distribution
        type_stats = db.session.query(
            Notification.notification_type,
            db.func.count(Notification.id).label('count')
        ).group_by(Notification.notification_type).all()
        
        type_data = [
            {
                'notification_type': stat.notification_type.value if stat.notification_type else None,
                'count': stat.count
            } for stat in type_stats
        ]
        
        # Recent notifications
        recent_notifications = Notification.query.order_by(
            Notification.created_at.desc()
        ).limit(10).all()
        
        recent_data = [
            {
                'id': notification.id,
                'title': notification.title,
                'notification_type': notification.notification_type.value if notification.notification_type else None,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat()
            } for notification in recent_notifications
        ]
        
        return jsonify({
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'read_notifications': total_notifications - unread_notifications,
            'notification_type_distribution': type_data,
            'recent_notifications': recent_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
