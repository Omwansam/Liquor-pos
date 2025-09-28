from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import AuditLog, User
from datetime import datetime, timedelta

audit_bp = Blueprint('audit', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

def log_audit_event(user_id, action, table_name=None, record_id=None, old_values=None, new_values=None, ip_address=None, user_agent=None):
    """Helper function to log audit events"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Failed to log audit event: {str(e)}")

@audit_bp.route('/audit/logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs with pagination and filtering (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_id = request.args.get('user_id', type=int)
        action = request.args.get('action', '')
        table_name = request.args.get('table_name', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Build query
        query = AuditLog.query
        
        # Add filters
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if action:
            query = query.filter(AuditLog.action.contains(action))
        
        if table_name:
            query = query.filter(AuditLog.table_name == table_name)
        
        # Add date range filter
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(AuditLog.created_at >= start_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(AuditLog.created_at < end_date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Order by created date (newest first)
        query = query.order_by(AuditLog.created_at.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        logs = []
        for log in pagination.items:
            logs.append({
                'id': log.id,
                'user_id': log.user_id,
                'user_name': log.user.name if log.user else 'System',
                'user_username': log.user.username if log.user else None,
                'action': log.action,
                'table_name': log.table_name,
                'record_id': log.record_id,
                'old_values': log.old_values,
                'new_values': log.new_values,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'created_at': log.created_at.isoformat()
            })
        
        return jsonify({
            'logs': logs,
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

@audit_bp.route('/audit/logs/<int:log_id>', methods=['GET'])
@jwt_required()
def get_audit_log(log_id):
    """Get a specific audit log by ID (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        log = AuditLog.query.get_or_404(log_id)
        
        return jsonify({
            'id': log.id,
            'user_id': log.user_id,
            'user': {
                'id': log.user.id,
                'name': log.user.name,
                'username': log.user.username,
                'email': log.user.email
            } if log.user else None,
            'action': log.action,
            'table_name': log.table_name,
            'record_id': log.record_id,
            'old_values': log.old_values,
            'new_values': log.new_values,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'created_at': log.created_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/audit/stats', methods=['GET'])
@jwt_required()
def get_audit_stats():
    """Get audit log statistics (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        # Get date range from query params
        days = request.args.get('days', 30, type=int)
        start_date = datetime.now() - timedelta(days=days)
        
        # Total logs
        total_logs = AuditLog.query.count()
        logs_in_period = AuditLog.query.filter(AuditLog.created_at >= start_date).count()
        
        # Action distribution
        action_stats = db.session.query(
            AuditLog.action,
            db.func.count(AuditLog.id).label('count')
        ).filter(AuditLog.created_at >= start_date).group_by(AuditLog.action).all()
        
        action_data = [
            {
                'action': stat.action,
                'count': stat.count
            } for stat in action_stats
        ]
        
        # Table distribution
        table_stats = db.session.query(
            AuditLog.table_name,
            db.func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.created_at >= start_date,
            AuditLog.table_name.isnot(None)
        ).group_by(AuditLog.table_name).all()
        
        table_data = [
            {
                'table_name': stat.table_name,
                'count': stat.count
            } for stat in table_stats
        ]
        
        # Most active users
        user_stats = db.session.query(
            User.id,
            User.name,
            User.username,
            db.func.count(AuditLog.id).label('log_count')
        ).join(AuditLog).filter(
            AuditLog.created_at >= start_date
        ).group_by(User.id, User.name, User.username).order_by(
            db.func.count(AuditLog.id).desc()
        ).limit(10).all()
        
        user_data = [
            {
                'user_id': stat.id,
                'user_name': stat.name,
                'username': stat.username,
                'log_count': stat.log_count
            } for stat in user_stats
        ]
        
        # Recent activity
        recent_logs = AuditLog.query.order_by(
            AuditLog.created_at.desc()
        ).limit(10).all()
        
        recent_data = [
            {
                'id': log.id,
                'user_name': log.user.name if log.user else 'System',
                'action': log.action,
                'table_name': log.table_name,
                'created_at': log.created_at.isoformat()
            } for log in recent_logs
        ]
        
        return jsonify({
            'period_days': days,
            'total_logs': total_logs,
            'logs_in_period': logs_in_period,
            'action_distribution': action_data,
            'table_distribution': table_data,
            'most_active_users': user_data,
            'recent_activity': recent_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/audit/users/<int:user_id>/activity', methods=['GET'])
@jwt_required()
def get_user_audit_activity(user_id):
    """Get audit activity for a specific user (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        # Validate user exists
        user = User.query.get_or_404(user_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query user's audit logs
        query = AuditLog.query.filter_by(user_id=user_id).order_by(
            AuditLog.created_at.desc()
        )
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        logs = []
        for log in pagination.items:
            logs.append({
                'id': log.id,
                'action': log.action,
                'table_name': log.table_name,
                'record_id': log.record_id,
                'old_values': log.old_values,
                'new_values': log.new_values,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat()
            })
        
        return jsonify({
            'user': {
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'email': user.email
            },
            'logs': logs,
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

@audit_bp.route('/audit/cleanup', methods=['POST'])
@jwt_required()
def cleanup_audit_logs():
    """Clean up old audit logs (admin only)"""
    try:
        # Check if user has permission (admin only)
        current_user_id = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get retention period (default 90 days)
        days = data.get('days', 90)
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Delete old logs
        deleted_count = AuditLog.query.filter(
            AuditLog.created_at < cutoff_date
        ).delete()
        
        db.session.commit()
        
        # Log the cleanup action
        log_audit_event(
            user_id=current_user_id,
            action='CLEANUP_AUDIT_LOGS',
            table_name='audit_logs',
            new_values={'deleted_count': deleted_count, 'cutoff_date': cutoff_date.isoformat()}
        )
        
        return jsonify({
            'message': f'Cleaned up {deleted_count} audit logs older than {days} days'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
