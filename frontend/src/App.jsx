import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart") || "[]"));

  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortField, setSortField] = useState("category_name");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    axios.get("/api/products")
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
    const endpoint = format === "xlsx" ? "/api/export/xlsx" : "/api/export/xml";
    const response = await axios.post(endpoint, selected, {
      responseType: "blob",
    });
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `products.${format}`;
    link.click();
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
        {/* ... фільтри та сортування ... */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => exportSelected("xlsx")}
            disabled={selected.length === 0}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Експорт XLSX (вибрані)
          </button>
          <button
            onClick={() => exportSelected("xml")}
            disabled={selected.length === 0}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            Експорт XML (вибрані)
          </button>
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
              <th className="p-2">Оптова ціна, грн</th>
              <th className="p-2">Оптова ціна, USD</th>
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
                <td className="p-2">{Number(p.price_uah).toLocaleString()}</td>
                <td className="p-2">{Number(p.price_usd).toLocaleString()}</td>
                <td className="p-2">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
