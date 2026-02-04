#!/usr/bin/env python3
"""
Sync product images from static/uploads into the database.

It expects filenames like:
  product_<product_id>_<anything>.<ext>

And stores image_url in DB as:
  uploads/<filename>
Which matches Flask static: /static/uploads/<filename>
"""

import os
import re

from app import app
from extensions import db
from models import Product, ProductImage


UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")
FILENAME_RE = re.compile(r"^product_(\d+)_", re.IGNORECASE)


def sync_images() -> dict:
    if not os.path.isdir(UPLOADS_DIR):
        raise RuntimeError(f"Uploads directory not found: {UPLOADS_DIR}")

    created = 0
    skipped_no_match = 0
    skipped_missing_product = 0
    already_present = 0
    primary_set = 0

    # Track if product already has any images (to set primary on first)
    existing_primary_by_product = {
        pid for (pid,) in db.session.query(ProductImage.product_id).filter(ProductImage.is_primary.is_(True)).all()
    }

    for filename in sorted(os.listdir(UPLOADS_DIR)):
        m = FILENAME_RE.match(filename)
        if not m:
            skipped_no_match += 1
            continue

        product_id = int(m.group(1))

        product = db.session.get(Product, product_id)
        if not product:
            skipped_missing_product += 1
            continue

        image_url = f"uploads/{filename}"

        existing = ProductImage.query.filter_by(product_id=product_id, image_url=image_url).first()
        if existing:
            already_present += 1
            continue

        is_primary = product_id not in existing_primary_by_product and (
            ProductImage.query.filter_by(product_id=product_id).count() == 0
        )
        if is_primary:
            existing_primary_by_product.add(product_id)
            primary_set += 1

        db.session.add(
            ProductImage(
                product_id=product_id,
                image_url=image_url,
                is_primary=is_primary,
                alt_text=getattr(product, "name", None) or getattr(product, "product_name", None),
            )
        )
        created += 1

    db.session.commit()

    # Ensure every product with images has exactly one primary (best-effort)
    products_with_images = db.session.query(ProductImage.product_id).distinct().all()
    for (pid,) in products_with_images:
        has_primary = ProductImage.query.filter_by(product_id=pid, is_primary=True).first()
        if not has_primary:
            first = ProductImage.query.filter_by(product_id=pid).order_by(ProductImage.image_id.asc()).first()
            if first:
                first.is_primary = True
                primary_set += 1
    db.session.commit()

    return {
        "created": created,
        "already_present": already_present,
        "skipped_no_match": skipped_no_match,
        "skipped_missing_product": skipped_missing_product,
        "primary_set": primary_set,
        "uploads_dir": UPLOADS_DIR,
    }


def main():
    with app.app_context():
        result = sync_images()
        print("Sync complete:")
        for k, v in result.items():
            print(f"- {k}: {v}")


if __name__ == "__main__":
    main()

