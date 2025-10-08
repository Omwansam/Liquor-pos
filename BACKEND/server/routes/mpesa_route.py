from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import MpesaTransaction, MpesaC2BTransaction, Sale, MpesaTransactionStatus, MpesaTransactionType
from utils.daraja_client import initiate_stk_push, simulate_c2b_payment, query_transaction_status, register_c2b_urls
from decimal import Decimal
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
mpesa_bp = Blueprint('mpesa', __name__)

def get_current_user():
    """Helper function to get current user from JWT"""
    current_identity = get_jwt_identity()
    if isinstance(current_identity, dict):
        return current_identity.get('id')
    return current_identity

@mpesa_bp.route('/mpesa/stk-push', methods=['POST'])
@jwt_required()
def initiate_stk_push_payment():
    """
    Initiate STK Push payment for a sale
    """
    try:
        current_user_id = get_current_user()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['phone_number', 'amount', 'account_reference']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        phone_number = data['phone_number']
        amount = data['amount']
        account_reference = data['account_reference']
        description = data.get('description', 'Liquor Store Payment')
        
        # Create M-Pesa transaction record
        mpesa_transaction = MpesaTransaction(
            transaction_type=MpesaTransactionType.STK_PUSH,
            amount=Decimal(str(amount)),
            phone_number=phone_number,
            account_reference=account_reference,
            transaction_desc=description,
            status=MpesaTransactionStatus.PENDING,
            user_id=current_user_id
        )
        
        db.session.add(mpesa_transaction)
        db.session.flush()  # Get the ID
        
        # Generate unique transaction ID
        transaction_id = f"TXN{mpesa_transaction.id}{datetime.now().strftime('%Y%m%d%H%M%S')}"
        mpesa_transaction.transaction_id = transaction_id
        
        # Initiate STK Push
        response_data, status_code = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            order_id=mpesa_transaction.id,
            description=description
        )
        
        if status_code == 200:
            # Update transaction with M-Pesa response
            mpesa_transaction.checkout_request_id = response_data.get('CheckoutRequestID')
            mpesa_transaction.merchant_request_id = response_data.get('MerchantRequestID')
            mpesa_transaction.mpesa_data = response_data
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'STK Push initiated successfully',
                'transaction_id': transaction_id,
                'checkout_request_id': response_data.get('CheckoutRequestID'),
                'merchant_request_id': response_data.get('MerchantRequestID')
            }), 200
        else:
            # Update transaction status to failed
            mpesa_transaction.status = MpesaTransactionStatus.FAILED
            mpesa_transaction.result_desc = response_data.get('error', 'STK Push failed')
            mpesa_transaction.mpesa_data = response_data
            
            db.session.commit()
            
            return jsonify({
                'success': False,
                'error': response_data.get('error', 'STK Push failed')
            }), status_code
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initiating STK Push: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@mpesa_bp.route('/mpesa/callback', methods=['POST'])
def stk_push_callback():
    """
    Handle STK Push callback from Safaricom
    """
    try:
        data = request.get_json()
        logger.info(f"STK Push callback received: {data}")
        
        if not data:
            return jsonify({'ResultCode': 1, 'ResultDesc': 'No data received'}), 400
        
        # Extract callback data
        stk_callback = data.get('Body', {}).get('stkCallback', {})
        merchant_request_id = stk_callback.get('MerchantRequestID')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        result_code = stk_callback.get('ResultCode')
        result_desc = stk_callback.get('ResultDesc')
        
        if not checkout_request_id:
            logger.error("No CheckoutRequestID in callback")
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Invalid callback data'}), 400
        
        # Find the transaction
        transaction = MpesaTransaction.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()
        
        if not transaction:
            logger.error(f"Transaction not found for CheckoutRequestID: {checkout_request_id}")
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Transaction not found'}), 404
        
        # Update transaction based on result
        transaction.result_code = str(result_code)
        transaction.result_desc = result_desc
        transaction.mpesa_data = data
        transaction.completed_at = datetime.utcnow()
        
        if result_code == 0:  # Success
            transaction.status = MpesaTransactionStatus.COMPLETED
            
            # Extract payment details from callback
            callback_metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            for item in callback_metadata:
                name = item.get('Name')
                value = item.get('Value')
                
                if name == 'MpesaReceiptNumber':
                    transaction.mpesa_receipt_number = value
                elif name == 'PhoneNumber':
                    transaction.phone_number = str(value)
            
            logger.info(f"STK Push payment successful: {transaction.mpesa_receipt_number}")
            
        else:  # Failed
            transaction.status = MpesaTransactionStatus.FAILED
            logger.info(f"STK Push payment failed: {result_desc}")
        
        db.session.commit()
        
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Success'}), 200
        
    except Exception as e:
        logger.error(f"Error processing STK Push callback: {str(e)}")
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Internal server error'}), 500

@mpesa_bp.route('/mpesa/c2b/validation', methods=['POST'])
def c2b_validation():
    """
    Validate C2B payment requests
    """
    try:
        data = request.get_json()
        logger.info(f"C2B validation request: {data}")
        
        # For now, accept all payments
        # You can add custom validation logic here
        
        return jsonify({
            'ResultCode': 0,
            'ResultDesc': 'Accepted'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in C2B validation: {str(e)}")
        return jsonify({
            'ResultCode': 1,
            'ResultDesc': 'Validation failed'
        }), 500

@mpesa_bp.route('/mpesa/c2b/confirmation', methods=['POST'])
def c2b_confirmation():
    """
    Handle C2B payment confirmation from Safaricom
    """
    try:
        data = request.get_json()
        logger.info(f"C2B confirmation received: {data}")
        
        if not data:
            return jsonify({'ResultCode': 1, 'ResultDesc': 'No data received'}), 400
        
        # Create C2B transaction record
        c2b_transaction = MpesaC2BTransaction(
            transaction_type=data.get('TransactionType', ''),
            trans_id=data.get('TransID', ''),
            trans_time=data.get('TransTime', ''),
            trans_amount=Decimal(str(data.get('TransAmount', 0))),
            business_short_code=data.get('BusinessShortCode', ''),
            bill_ref_number=data.get('BillRefNumber', ''),
            invoice_number=data.get('InvoiceNumber', ''),
            org_account_balance=Decimal(str(data.get('OrgAccountBalance', 0))) if data.get('OrgAccountBalance') else None,
            third_party_trans_id=data.get('ThirdPartyTransID', ''),
            msisdn=data.get('MSISDN', ''),
            first_name=data.get('FirstName', ''),
            middle_name=data.get('MiddleName', ''),
            last_name=data.get('LastName', ''),
            raw_data=data
        )
        
        db.session.add(c2b_transaction)
        db.session.commit()
        
        logger.info(f"C2B transaction recorded: {c2b_transaction.trans_id}")
        
        return jsonify({
            'ResultCode': 0,
            'ResultDesc': 'Success'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing C2B confirmation: {str(e)}")
        return jsonify({
            'ResultCode': 1,
            'ResultDesc': 'Processing failed'
        }), 500

@mpesa_bp.route('/mpesa/c2b/simulate', methods=['POST'])
@jwt_required()
def simulate_c2b():
    """
    Simulate C2B payment for testing (sandbox only)
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['phone_number', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        phone_number = data['phone_number']
        amount = data['amount']
        account_reference = data.get('account_reference', 'TEST001')
        command_id = data.get('command_id', 'CustomerPayBillOnline')
        
        # Simulate C2B payment
        response_data, status_code = simulate_c2b_payment(
            phone_number=phone_number,
            amount=amount,
            account_reference=account_reference,
            command_id=command_id
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        logger.error(f"Error simulating C2B payment: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@mpesa_bp.route('/mpesa/transaction-status/<checkout_request_id>', methods=['GET'])
@jwt_required()
def check_transaction_status(checkout_request_id):
    """
    Check the status of an STK Push transaction
    """
    try:
        # First check our database
        transaction = MpesaTransaction.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        # If transaction is still pending, query M-Pesa API
        if transaction.status == MpesaTransactionStatus.PENDING:
            response_data, status_code = query_transaction_status(checkout_request_id)
            
            if status_code == 200:
                result_code = response_data.get('ResultCode')
                result_desc = response_data.get('ResultDesc')
                
                # Update transaction status
                transaction.result_code = str(result_code)
                transaction.result_desc = result_desc
                transaction.mpesa_data = response_data
                
                if result_code == '0':
                    transaction.status = MpesaTransactionStatus.COMPLETED
                    transaction.completed_at = datetime.utcnow()
                elif result_code in ['1032', '1037']:  # User cancelled or timeout
                    transaction.status = MpesaTransactionStatus.CANCELLED
                else:
                    transaction.status = MpesaTransactionStatus.FAILED
                
                db.session.commit()
        
        return jsonify({
            'success': True,
            'transaction': transaction.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking transaction status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@mpesa_bp.route('/mpesa/transactions', methods=['GET'])
@jwt_required()
def get_mpesa_transactions():
    """
    Get M-Pesa transactions with pagination and filtering
    """
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        phone_number = request.args.get('phone_number', '')
        
        # Build query
        query = MpesaTransaction.query
        
        if status:
            query = query.filter(MpesaTransaction.status == MpesaTransactionStatus(status))
        
        if phone_number:
            query = query.filter(MpesaTransaction.phone_number.contains(phone_number))
        
        # Order by most recent first
        query = query.order_by(MpesaTransaction.initiated_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        transactions = [transaction.to_dict() for transaction in pagination.items]
        
        return jsonify({
            'success': True,
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
        logger.error(f"Error fetching M-Pesa transactions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@mpesa_bp.route('/mpesa/c2b/transactions', methods=['GET'])
@jwt_required()
def get_c2b_transactions():
    """
    Get C2B transactions with pagination and filtering
    """
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        processed = request.args.get('processed', '')
        
        # Build query
        query = MpesaC2BTransaction.query
        
        if processed:
            query = query.filter(MpesaC2BTransaction.processed == (processed.lower() == 'true'))
        
        # Order by most recent first
        query = query.order_by(MpesaC2BTransaction.created_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        transactions = [transaction.to_dict() for transaction in pagination.items]
        
        return jsonify({
            'success': True,
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
        logger.error(f"Error fetching C2B transactions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@mpesa_bp.route('/mpesa/register-urls', methods=['POST'])
@jwt_required()
def register_urls():
    """
    Register C2B URLs with Safaricom (admin only)
    """
    try:
        response_data, status_code = register_c2b_urls()
        return jsonify(response_data), status_code
        
    except Exception as e:
        logger.error(f"Error registering C2B URLs: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
