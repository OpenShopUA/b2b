import requests
import xml.etree.ElementTree as ET
from sqlalchemy.orm import Session
from database import SessionLocal, Product
import re
import os


def parse_int(value):
    try:
        return int(float(str(value).replace(",", ".").replace(" ", "")))
    except:
        return 0


def parse_float(value):
    try:
        cleaned = re.sub(r"[^\d.,]", "", str(value))
        cleaned = cleaned.replace(",", ".")
        return float(cleaned)
    except:
        return 0.0


def get_text(elem, tag):
    t = elem.find(tag)
    return t.text.strip() if t is not None and t.text else ""


async def import_products_from_xml_url():
    # Використовуємо змінну середовища з можливістю вказати значення за замовчуванням
    url = os.getenv("XML_IMPORT_URL", "https://example.com/export/products.xml")
    response = requests.get(url)
    response.encoding = "utf-8"

    if response.status_code != 200:
        raise Exception(f"Не вдалося завантажити XML. Статус: {response.status_code}")

    root = ET.fromstring(response.content)

    # 1. Побудуємо мапу ID → Назва категорії
    category_map = {}
    for cat in root.findall("shop/categories/category"):
        cat_id = cat.attrib.get("id")
        cat_name = cat.text
        if cat_id and cat_name:
            category_map[cat_id.strip()] = cat_name.strip()

    db: Session = SessionLocal()
    db.query(Product).delete()

    # 2. Імпортуємо товари
    for offer in root.findall("shop/offers/offer"):
        category_id = offer.findtext("categoryId", "").strip()
        category_name = category_map.get(category_id, "")

        product = Product(
            product_code=offer.findtext("id"),
            article=offer.findtext("sku"),
            title=offer.findtext("name"),
            category=category_id,
            category_name=category_name,
            brand=offer.findtext("brand"),
            stock=parse_int(offer.findtext("stock")),
            price_uah=parse_float(offer.findtext("price")),
            price_usd=parse_float(offer.findtext("price_opt_usd")),
            image=offer.findtext("picture"),  # перше зображення
        )
        db.add(product)

    db.commit()
    total = db.query(Product).count()
    db.close()
    print(f"✅ Імпортовано {total} товарів з XML")
    return {"status": "success", "imported": total}