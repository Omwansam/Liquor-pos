import base64
import requests
from datetime import datetime
from flask import current_app
import logging

logger = logging.getLogger(__name__)




def get_mpesa_access_token():

    """Generates an access token required for authenticating M-Pesa API calls."""

    url = current_app.config.get('DARAJA_AUTH_URL')
    consumer_key = current_app.config.get('MPESA_CONSUMER_KEY')
    consumer_secret = current_app.config.get('MPESA_CONSUMER_SECRET')

    # Validate configuration early to avoid 400 from M-Pesa due to empty creds
    if not consumer_key or not consumer_secret:
        raise Exception("Missing MPESA credentials. Please set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in your .env file.")

    logger.info(f"Getting M-Pesa access token from: {url}")
    logger.info(f"Consumer key: {consumer_key[:10]}...")  # Log first 10 chars for security

    credentials = f"{consumer_key}:{consumer_secret}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Accept": "application/json"
    }
    
    try:

        response = requests.get(url, headers=headers, timeout=30)
        logger.info(f"M-Pesa auth response status: {response.status_code}")
        logger.info(f"M-Pesa auth response headers: {dict(response.headers)}")
        
        # Check if response is JSON
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type:
            # Safaricom returns 400 text/plain for invalid credentials
            if response.status_code == 400:
                raise Exception("Invalid MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET. Please check your .env file and ensure you have valid sandbox credentials from https://developer.safaricom.co.ke/")
            logger.error(f"Expected JSON response but got: {content_type}")
            logger.error(f"Response text: {response.text[:500]}")  # Log first 500 chars
            raise Exception(f"M-Pesa API returned non-JSON response. Status: {response.status_code}")
        
        try:
            response_data = response.json()
            logger.info(f"M-Pesa auth response: {response_data}")
        except Exception as json_error:
            logger.error(f"Failed to parse JSON response: {response.text[:500]}")
            raise Exception(f"Invalid JSON response from M-Pesa API: {str(json_error)}")

        if "access_token" in response_data:
            logger.info("M-Pesa access token obtained successfully")
            return response_data["access_token"]
        else:
            error_msg = response_data.get('error_description', 'Unknown error')
            logger.error(f"Error obtaining access token: {error_msg}")
            raise Exception(f"Error obtaining access token: {error_msg}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error fetching M-pesa access token: {str(e)}")
        raise Exception(f"Network error: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching M-pesa access token: {str(e)}")
        raise Exception(f"Error fetching M-pesa access token: {str(e)}")
    

#######################################################################################################################################################################################################################    
def generate_mpesa_password(timestamp):
    """Generate M-Pesa API password"""
    shortcode = current_app.config['MPESA_SHORTCODE']
    passkey = current_app.config['MPESA_PASSKEY']
    return base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()
    

############################################################################################################################################################################################################    

def sanitize_phone_number(phone):
    """
    Convert phone number to 2547XXXXXXXX format for M-Pesa API.
    Handles various input formats: 0712345678, +254712345678, 254712345678, 712345678
    """
    if not phone:
        return None
        
    # Remove all non-digit characters
    phone = ''.join(c for c in str(phone) if c.isdigit())
    
    # Handle different formats
    if phone.startswith('0') and len(phone) == 10:  # 0712345678
        return '254' + phone[1:]
    elif phone.startswith('+254'):  # +254712345678
        return phone[1:]
    elif phone.startswith('254') and len(phone) == 12:  # 254712345678
        return phone
    elif len(phone) == 9:  # 712345678
        return '254' + phone
    elif len(phone) == 10 and not phone.startswith('0'):  # 7123456789 (some formats)
        return '254' + phone
    
    logger.warning(f"Invalid phone number format: {phone}")
    return None    

###########################################################################################################################################################################################################

def initiate_stk_push(phone_number, amount, order_id, description='Furniture Payment'):
    """
    Initiates M-Pesa STK Push payment request using the official Safaricom Daraja API.
    
    Args:
        phone_number (str): Customer phone number in any format
        amount (float): Payment amount
        order_id (int): Order ID for reference
        description (str): Transaction description
        
    Returns:
        tuple: (response_data, status_code)
    """
    logger.info(f"Starting STK push for order {order_id}, amount {amount}, phone {phone_number}")

    try:
        access_token = get_mpesa_access_token()
        if not access_token:
            logger.error("Failed to authenticate with M-Pesa")
            return {"error": "Failed to authenticate with M-Pesa"}, 500

        # Validate and format phone number
        sanitized_phone = sanitize_phone_number(phone_number)
        if not sanitized_phone:
            logger.error(f"Invalid phone number format: {phone_number}")
            return {"error": "Invalid phone number format. Use formats like: 0712345678, +254712345678, or 254712345678"}, 400
        
        # Validate amount
        try:
            amount_int = int(round(float(amount)))
            if amount_int <= 0:
                logger.error("Amount must be greater than 0")
                return {"error": "Amount must be greater than 0"}, 400
        except (ValueError, TypeError):
            logger.error(f"Invalid amount provided: {amount}")
            return {"error": "Invalid amount"}, 400

        # Prepare STK push request parameters
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = generate_mpesa_password(timestamp)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": current_app.config['MPESA_SHORTCODE'],
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount_int,
            "PartyA": sanitized_phone,
            "PartyB": current_app.config['MPESA_SHORTCODE'],
            "PhoneNumber": sanitized_phone,
            "CallBackURL": current_app.config['MPESA_CALLBACK_URL'],
            "AccountReference": str(order_id)[:12],  # Max 12 chars
            "TransactionDesc": description[:13]  # Max 13 chars
        }
    
        # Make API request to Safaricom
        stk_push_url = current_app.config.get('DARAJA_STK_PUSH_URL', current_app.config.get('MPESA_STK_PUSH_URL'))
        logger.info(f"Making STK push request to: {stk_push_url}")
        logger.info(f"STK push payload: {payload}")
        
        response = requests.post(
            stk_push_url,
            json=payload,
            headers=headers,
            timeout=30
        )
        logger.info(f"STK push response status: {response.status_code}")
        logger.info(f"STK push response headers: {dict(response.headers)}")
        
        # Check if response is JSON
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type:
            logger.error(f"Expected JSON response but got: {content_type}")
            logger.error(f"Response text: {response.text[:500]}")  # Log first 500 chars
            return {"error": f"M-Pesa API returned non-JSON response. Status: {response.status_code}"}, 500
        
        try:
            response_data = response.json()
            logger.info(f"STK push initiated successfully: {response_data}")
            
            # Check for API errors in response
            if response.status_code == 200 and response_data.get('ResponseCode') == '0':
                logger.info("STK push request accepted by M-Pesa")
                return response_data, 200
            else:
                error_msg = response_data.get('ResponseDescription', 'Unknown error')
                logger.error(f"STK push failed: {error_msg}")
                return {"error": f"STK push failed: {error_msg}"}, 400
                
        except Exception as json_error:
            logger.error(f"Failed to parse JSON response: {response.text[:500]}")
            return {"error": f"Invalid JSON response from M-Pesa API: {str(json_error)}"}, 500
        
    except requests.exceptions.RequestException as e:
        logger.error(f"STK Push network error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                return error_data, e.response.status_code
            except:
                logger.error(f"Failed to parse error response: {e.response.text[:500]}")
                return {"error": f"Network error: {str(e)}"}, 500
        else:
            return {"error": f"Network error: {str(e)}"}, 500
    except Exception as e:
        logger.error(f"Unexpected error in STK Push: {str(e)}")
        return {"error": "Internal server error"}, 500   

###########################################################################################################################################################

def register_c2b_urls():
    """
    Register C2B URLs with Safaricom for receiving payment notifications.
    This should be called once during application setup.
    """
    logger.info("Registering C2B URLs with Safaricom")
    
    try:
        access_token = get_mpesa_access_token()
        if not access_token:
            logger.error("Failed to authenticate with M-Pesa for C2B URL registration")
            return {"error": "Failed to authenticate with M-Pesa"}, 500

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "ShortCode": current_app.config['MPESA_SHORTCODE'],
            "ResponseType": "Completed",  # Only send completed transactions
            "ConfirmationURL": current_app.config['MPESA_C2B_CONFIRMATION_URL'],
            "ValidationURL": current_app.config['MPESA_C2B_VALIDATION_URL']
        }

        c2b_register_url = current_app.config.get('DARAJA_C2B_REGISTER_URL')
        logger.info(f"Registering C2B URLs at: {c2b_register_url}")
        logger.info(f"C2B registration payload: {payload}")
        
        response = requests.post(
            c2b_register_url,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"C2B registration response status: {response.status_code}")
        logger.info(f"C2B registration response: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('ResponseCode') == '0':
                logger.info("C2B URLs registered successfully")
                return response_data, 200
            else:
                error_msg = response_data.get('ResponseDescription', 'Unknown error')
                logger.error(f"C2B URL registration failed: {error_msg}")
                return {"error": f"C2B URL registration failed: {error_msg}"}, 400
        else:
            logger.error(f"C2B URL registration failed with status: {response.status_code}")
            return {"error": f"C2B URL registration failed: {response.text}"}, response.status_code
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during C2B URL registration: {str(e)}")
        return {"error": f"Network error: {str(e)}"}, 500
    except Exception as e:
        logger.error(f"Unexpected error during C2B URL registration: {str(e)}")
        return {"error": "Internal server error"}, 500

###########################################################################################################################################################

def simulate_c2b_payment(phone_number, amount, account_reference="", command_id="CustomerPayBillOnline"):
    """
    Simulate a C2B payment for testing purposes (sandbox only).
    In production, customers will make payments directly through M-Pesa.
    
    Args:
        phone_number (str): Customer phone number
        amount (float): Payment amount
        account_reference (str): Account reference (optional)
        command_id (str): Transaction type ("CustomerPayBillOnline" or "CustomerBuyGoodsOnline")
        
    Returns:
        tuple: (response_data, status_code)
    """
    logger.info(f"Simulating C2B payment: phone={phone_number}, amount={amount}, ref={account_reference}")
    
    try:
        access_token = get_mpesa_access_token()
        if not access_token:
            logger.error("Failed to authenticate with M-Pesa for C2B simulation")
            return {"error": "Failed to authenticate with M-Pesa"}, 500

        # Validate and format phone number
        sanitized_phone = sanitize_phone_number(phone_number)
        if not sanitized_phone:
            logger.error(f"Invalid phone number format: {phone_number}")
            return {"error": "Invalid phone number format"}, 400
        
        # Validate amount
        try:
            amount_int = int(round(float(amount)))
            if amount_int <= 0:
                logger.error("Amount must be greater than 0")
                return {"error": "Amount must be greater than 0"}, 400
        except (ValueError, TypeError):
            logger.error(f"Invalid amount provided: {amount}")
            return {"error": "Invalid amount"}, 400

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "ShortCode": current_app.config['MPESA_SHORTCODE'],
            "CommandID": command_id,
            "Amount": amount_int,
            "Msisdn": sanitized_phone,
            "BillRefNumber": account_reference or "TEST001"
        }

        c2b_simulate_url = current_app.config.get('DARAJA_C2B_SIMULATE_URL')
        logger.info(f"Simulating C2B payment at: {c2b_simulate_url}")
        logger.info(f"C2B simulation payload: {payload}")
        
        response = requests.post(
            c2b_simulate_url,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"C2B simulation response status: {response.status_code}")
        logger.info(f"C2B simulation response: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('ResponseCode') == '0':
                logger.info("C2B payment simulation successful")
                return response_data, 200
            else:
                error_msg = response_data.get('ResponseDescription', 'Unknown error')
                logger.error(f"C2B simulation failed: {error_msg}")
                return {"error": f"C2B simulation failed: {error_msg}"}, 400
        else:
            logger.error(f"C2B simulation failed with status: {response.status_code}")
            return {"error": f"C2B simulation failed: {response.text}"}, response.status_code
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during C2B simulation: {str(e)}")
        return {"error": f"Network error: {str(e)}"}, 500
    except Exception as e:
        logger.error(f"Unexpected error during C2B simulation: {str(e)}")
        return {"error": "Internal server error"}, 500

###########################################################################################################################################################

def query_transaction_status(checkout_request_id):
    """
    Query the status of an STK Push transaction.
    
    Args:
        checkout_request_id (str): The CheckoutRequestID from STK Push response
        
    Returns:
        tuple: (response_data, status_code)
    """
    logger.info(f"Querying transaction status for: {checkout_request_id}")
    
    try:
        access_token = get_mpesa_access_token()
        if not access_token:
            logger.error("Failed to authenticate with M-Pesa for transaction query")
            return {"error": "Failed to authenticate with M-Pesa"}, 500

        # Generate password and timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = generate_mpesa_password(timestamp)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": current_app.config['MPESA_SHORTCODE'],
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        query_url = current_app.config.get('DARAJA_TRANSACTION_STATUS_URL')
        logger.info(f"Querying transaction status at: {query_url}")
        logger.info(f"Transaction query payload: {payload}")
        
        response = requests.post(
            query_url,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"Transaction query response status: {response.status_code}")
        logger.info(f"Transaction query response: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            logger.info("Transaction status query successful")
            return response_data, 200
        else:
            logger.error(f"Transaction query failed with status: {response.status_code}")
            return {"error": f"Transaction query failed: {response.text}"}, response.status_code
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during transaction query: {str(e)}")
        return {"error": f"Network error: {str(e)}"}, 500
    except Exception as e:
        logger.error(f"Unexpected error during transaction query: {str(e)}")
        return {"error": "Internal server error"}, 500

###########################################################################################################################################################

