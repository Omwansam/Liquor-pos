import os
from werkzeug.utils import secure_filename
from flask import current_app

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def generate_unique_filename(filename, product_id):
    """Generate a unique filename using the product ID."""
    basename = secure_filename(filename.rsplit('.',1)[0])
    extension = filename.rsplit('.',1)[1].lower()
    return f"product_{product_id}_{basename}.{extension}"

###########################################################################################################################################
# Blog media 



def save_product_image(file, product_id):
    """Save the uploaded image and return the relative path."""
    if not file or not allowed_file(file.filename):
        return None

    filename = generate_unique_filename(file.filename, product_id)
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

    try:
        file.save(file_path)
        return f"uploads/{filename}"
    except Exception as e:
        current_app.logger.error(f"Error saving product image: {str(e)}")
        return None
    
import os
from werkzeug.utils import secure_filename
from flask import current_app
from pathlib import Path

def delete_image_file(image_url):
    """
    Safely delete an image file from the filesystem.
    
    Args:
        image_url (str): The URL or path of the image to delete
        
    Returns:
        bool: True if file was deleted successfully, False otherwise
    """
    try:
        if not image_url:
            current_app.logger.warning("Empty image URL provided for deletion")
            return False
            
        # Extract filename securely
        filename = secure_filename(os.path.basename(image_url))
        if not filename:
            current_app.logger.error(f"Invalid filename extracted from URL: {image_url}")
            return False
            
        # Build full path safely
        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        if not upload_folder:
            current_app.logger.error("UPLOAD_FOLDER not configured")
            return False
            
        file_path = Path(upload_folder) / filename
        
        # Security check - ensure path is within upload folder
        try:
            file_path.resolve().relative_to(Path(upload_folder).resolve())
        except ValueError:
            current_app.logger.error(f"Attempted to delete file outside upload directory: {file_path}")
            return False
            
        # Delete the file
        if file_path.exists():
            file_path.unlink()
            current_app.logger.info(f"Successfully deleted image file: {file_path}")
            return True
            
        current_app.logger.warning(f"Image file not found: {file_path}")
        return False
        
    except Exception as e:
        current_app.logger.error(f"Error deleting image file {image_url}: {str(e)}", exc_info=True)
        return False    