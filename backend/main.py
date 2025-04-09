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
from fastapi import Request

app = FastAPI()

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
        orm_mode = True

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