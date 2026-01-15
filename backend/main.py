from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
from database import get_db, Product, init_db
from importer import import_products_from_xml_url
import asyncio
from fastapi.responses import Response
import xml.etree.ElementTree as ET
from fastapi.responses import StreamingResponse
import io
import pandas as pd
import os
import requests
import zipfile
from fastapi import Request

# Змінюємо FastAPI, щоб він працював з префіксом /api
app = FastAPI(openapi_prefix="/api")
# app = FastAPI(root_path="/api")

# CORS для фронтенду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # або вкажи домен фронта
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic модель для фронтенду
class ProductOut(BaseModel):
    id: int
    product_code: str
    article: str
    title: str
    #barcode: Optional[str] = None
    category: str
    category_name: str
    brand: str
    stock: int
    price_uah: float
    price_usd: float  # ← ДОДАТИ ЦЕ
    image: str

    class Config:
        from_attributes = True # Змінено з orm_mode на from_attributes для Pydantic V2

# Ініціалізація таблиць і імпорт при старті
@app.on_event("startup")
async def startup_event():
    for i in range(10):
        try:
            init_db()
            await import_products_from_xml_url()
            break
        except Exception as e:
            print(f"🔁 Спроба {i+1}/10: БД ще не готова, чекаю...")
            await asyncio.sleep(2)
    else:
        print("❌ Не вдалося підключитись до бази даних після 10 спроб.")

@app.get("/products", response_model=List[ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@app.post("/import-xml")
async def import_xml():
    return await import_products_from_xml_url()

@app.post("/export/xlsx")
async def export_selected_products_xlsx(request: Request, db: Session = Depends(get_db)):
    ids = await request.json()
    products = db.query(Product).filter(Product.id.in_(ids)).all()

    data = [p.__dict__ for p in products]
    for d in data:
        d.pop('_sa_instance_state', None)

    # Налаштування полів
    columns_order = [
        ("product_code", "ID"),
        ("title", "Назва товару"),
        ("category_name", "Категорія"),
        ("brand", "Бренд"),
        ("article", "Артикул"),
        ("price_uah", "Ціна, грн"),
        ("price_usd", "Ціна, USD"),
        ("stock", "Залишок"),
        ("image", "Зображення"),
    ]

    # Формування DataFrame з новими назвами колонок і порядком
    df = pd.DataFrame([
        {excel_name: item[db_name] for db_name, excel_name in columns_order}
        for item in data
    ])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=selected_products.xlsx"}
    )

@app.post("/export/xml")
async def export_selected_products_xml(request: Request, db: Session = Depends(get_db)):
    ids = await request.json()
    products = db.query(Product).filter(Product.id.in_(ids)).all()

    root = ET.Element("products")
    for p in products:
        item = ET.SubElement(root, "product")
        for key in [
            "product_code", "article", "title", "category", "category_name",
            "brand", "stock", "price_uah", "price_usd", "image"
        ]:
            ET.SubElement(item, key).text = str(getattr(p, key) or "")

    xml_data = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    return Response(
        content=xml_data,
        media_type="application/xml",
        headers={"Content-Disposition": "attachment; filename=selected_products.xml"}
    )

@app.get("/export/xlsx")
def export_all_products_xlsx(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    data = [p.__dict__ for p in products]
    for d in data:
        d.pop('_sa_instance_state', None)

    columns_order = [
        ("product_code", "ID"),
        ("title", "Назва товару"),
        ("category_name", "Категорія"),
        ("brand", "Бренд"),
        ("article", "Артикул"),
        ("price_uah", "Ціна, грн"),
        ("price_usd", "Ціна, USD"),
        ("stock", "Залишок"),
        ("image", "Зображення"),
    ]

    df = pd.DataFrame([
        {excel_name: item[db_name] for db_name, excel_name in columns_order}
        for item in data
    ])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=all_products.xlsx"}
    )

@app.delete("/products/zero-stock")
def delete_zero_stock_products(db: Session = Depends(get_db)):
    deleted_count = db.query(Product).filter(Product.stock == 0).delete()
    db.commit()
    return {"message": f"Видалено {deleted_count} товарів з нульовим залишком"}

@app.get("/export/xml/all")
def export_all_products_xml(db: Session = Depends(get_db)):
    products = db.query(Product).all()

    root = ET.Element("products")

    for p in products:
        item = ET.SubElement(root, "product")
        for key in [
            "product_code", "article", "title", "category", "category_name",
            "brand", "stock", "price_usd", "image"
        ]:
            ET.SubElement(item, key).text = str(getattr(p, key) or "")

    xml_data = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    return Response(
        content=xml_data,
        media_type="application/xml",
        headers={
            "Content-Disposition": "attachment; filename=all_products.xml"
        }
    )

@app.get("/xml")
def proxy_xml_feed(key: str):
    # Retrieve the base URL from environment variables
    # Default is a placeholder. User must Configure UPSTREAM_XML_URL in .env
    upstream_url = os.getenv("UPSTREAM_XML_URL", "https://portal.b2b-center.com.ua/daily_export_xml_archive.php")
    
    # Construct the URL
    if "{key}" in upstream_url:
        final_url = upstream_url.format(key=key)
    else:
        sep = "&" if "?" in upstream_url else "?"
        final_url = f"{upstream_url}{sep}key={key}"

    print(f"Fetching from: {final_url}")
    
    try:
        resp = requests.get(final_url, stream=True)
        # resp.raise_for_status() # Optional: decide if we want to 500 on 404 or pass it through
        
        if resp.status_code != 200:
             return Response(content=f"Upstream error: {resp.status_code}", status_code=resp.status_code)

        try:
            with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
                # Find the first XML file
                xml_files = [f for f in z.namelist() if f.endswith(".xml")]
                if not xml_files:
                    return Response(content="No XML file found in ZIP", status_code=502)
                
                # Extract content
                xml_content = z.read(xml_files[0])
                
                return Response(
                    content=xml_content,
                    media_type="application/xml",
                    headers={"Content-Disposition": f"attachment; filename={xml_files[0]}"}
                )
        except zipfile.BadZipFile:
            print("Not a zip file, returning content as is.")
            return Response(
                content=resp.content,
                media_type="application/xml",
                headers={"Content-Disposition": "attachment; filename=feed.xml"}
            )

    except Exception as e:
        print(f"Error: {e}")
        return Response(content=f"Error processing upstream: {str(e)}", status_code=500)
