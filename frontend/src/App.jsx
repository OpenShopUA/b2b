import React, { useEffect, useState } from "react";
import axios from "axios";

// Використовуємо динамічний API_URL з вікна або змінної середовища як запасний варіант
const API_URL = window.ENV?.API_URL || import.meta.env.VITE_API_URL || "";

export default function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart") || "[]"));

  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortField, setSortField] = useState("category_name");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    axios.get(`${API_URL}/products`)
      .then(res => {
        const filtered = res.data.filter(p =>
          Number(p.price_uah) > 0 && Number(p.price_usd) > 0
        );
        setProducts(filtered);
      })
      .catch(err => console.error("Помилка при отриманні продуктів:", err));
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const exportSelected = async (format) => {
    const endpoint = `${API_URL}/export/${format}`;
    const response = await axios.post(endpoint, selected, {
      responseType: "blob",
    });
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `products.${format}`;
    link.click();
  };

  const exportAll = () => {
    const link = document.createElement("a");
    link.href = `${API_URL}/export/xlsx`;
    link.download = "products.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = products
    .filter(p => !brandFilter || p.brand === brandFilter)
    .filter(p => !categoryFilter || p.category_name === categoryFilter)
    .sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const uniqueCategories = [...new Set(products.map(p => p.category_name).filter(Boolean))];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Каталог товарів</h1>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Всі бренди</option>
          {uniqueBrands.map((brand, i) => (
            <option key={i} value={brand}>{brand}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Всі категорії</option>
          {uniqueCategories.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="title">Назва</option>
          <option value="brand">Бренд</option>
          <option value="category_name">Категорія</option>
          <option value="price_uah">Ціна</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="asc">↑ Зростання</option>
          <option value="desc">↓ Спадання</option>
        </select>

        <div className="flex gap-2 ml-auto">
          {selected.length === 0 ? (
            <button
              onClick={exportAll}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              Завантажити весь прайс (XLSX) 
            </button>
          ) : (
            <>
              <button
                onClick={() => exportSelected("xlsx")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Експорт XLSX (вибрані)
              </button>
              <button
                onClick={() => exportSelected("xml")}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Експорт XML (вибрані)
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full bg-white rounded-xl shadow">
          <thead>
            <tr className="bg-gray-200 text-left text-sm uppercase text-gray-600">
              <th className="p-2">✓</th>
              <th className="p-2">Зображення</th>
              <th className="p-2">Id</th>
              <th className="p-2">Товар</th>
              <th className="p-2">Категорія</th>
              <th className="p-2">Бренд</th>
              <th className="p-2">Артикул</th>
              <th className="p-2">Оптова ціна, USD</th>
              <th className="p-2">Оптова ціна, грн</th>
              <th className="p-2">Залишок</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-100">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                <td className="p-2 relative group">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-24 h-24 object-contain rounded shadow-md"
                  />
                  <div className="fixed z-50 hidden group-hover:block bg-white border p-1 rounded shadow-xl"
                    style={{ top: "100px", left: "calc(100% - 400px)" }}>
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-[400px] h-[400px] object-contain"
                    />
                  </div>
                </td>
                <td className="p-2">{p.product_code}</td>
                <td className="p-2">{p.title}</td>
                <td className="p-2">{p.category_name}</td>
                <td className="p-2">{p.brand}</td>
                <td className="p-2">{p.article}</td>
                <td className="p-2">{Number(p.price_usd).toLocaleString()}</td>
                <td className="p-2">{Number(p.price_uah).toLocaleString()}</td>
                <td className="p-2">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
