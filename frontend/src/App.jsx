import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = window.ENV?.API_URL || import.meta.env.VITE_API_URL || "";

{/*// Компонент для статусу з'єднання*/}
const ConnectionStatus = ({ apiUrl }) => {
  const [status, setStatus] = useState("перевірка...");
  const [error, setError] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${apiUrl}/products`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        setProductCount(response.data.length);
        setStatus(`з'єднано (${responseTime}ms)`);
        setError(null);
      } catch (err) {
        setStatus("помилка");
        setError(err.message + (err.response ? ` (${err.response.status})` : ''));
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <div
      className="fixed bottom-0 right-0 bg-white p-2 m-2 shadow-md rounded text-xs z-50 max-w-xs cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="font-bold">Статус API з'єднання:</div>
      <div>URL: {apiUrl}</div>
      <div>Статус: <span className={status.includes("з'єднано") ? "text-green-600" : status === "перевірка..." ? "text-yellow-600" : "text-red-600"}>{status}</span></div>
      {productCount !== null && <div>Кількість 22продуктів: {productCount}</div>}
      {error && <div className="text-red-600 overflow-auto max-h-20">{error}</div>}

      {expanded && (
        <div className="mt-2 border-t pt-2">
          <div className="font-bold">Браузер і URL:</div>
          <div>Браузер: {navigator.userAgent}</div>
          <div>Поточна URL: {window.location.href}</div>
          <div>Host: {window.location.host}</div>
          <div>Origin: {window.location.origin}</div>
          <div className="text-gray-500 mt-2 text-[10px]">Клікніть, щоб сховати деталі</div>
        </div>
      )}
    </div>
  );
};


export default function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortField, setSortField] = useState("category_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // 1️⃣ Завантаження товарів
  useEffect(() => {
    axios.get(`${API_URL}/products`)
      .then(res => {
        setProducts(res.data); // без фільтрації
        setApiError(null);
      })
      .catch(err => {
        console.error("Помилка при отриманні продуктів:", err);
        setApiError(`Помилка завантаження: ${err.message}`);
      });
  }, []);

  // 2️⃣ Вибрані товари
  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // 3️⃣ Експорт
  const exportSelected = async (format) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/export/${format}`, selected, {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `products.${format}`;
      link.click();
    } catch (error) {
      alert("Помилка при експорті. Перевірте консоль.");
    } finally {
      setLoading(false);
    }
  };

  const exportAll = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/export/xlsx`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert("Помилка при завантаженні файлу.");
    } finally {
      setLoading(false);
    }
  };

  // 4️⃣ Фільтрація та сортування
  const filtered = products
    .filter(p => !isNaN(Number(p.stock)) && Number(p.stock) > 0) // основний фільтр
    .filter(p => !brandFilter || p.brand === brandFilter)
    .filter(p => !categoryFilter || p.category_name === categoryFilter)
    .sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      return typeof aVal === "number" && typeof bVal === "number"
        ? sortOrder === "asc" ? aVal - bVal : bVal - aVal
        : sortOrder === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
    });

  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const uniqueCategories = [...new Set(products.map(p => p.category_name).filter(Boolean))];

  return (
    <div className="p-4">
      <ConnectionStatus apiUrl={API_URL} />
      <h1 className="text-2xl font-bold mb-4">Каталог товарів</h1>

      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {apiError}
        </div>
      )}

      {/* Фільтри */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">Всі бренди</option>
          {uniqueBrands.map((brand, i) => <option key={i} value={brand}>{brand}</option>)}
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">Всі категорії</option>
          {uniqueCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
        </select>

        <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border px-2 py-1 rounded">
          <option value="title">Назва</option>
          <option value="brand">Бренд</option>
          <option value="category_name">Категорія</option>
          <option value="price_uah">Ціна</option>
        </select>

        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border px-2 py-1 rounded">
          <option value="asc">↑ Зростання</option>
          <option value="desc">↓ Спадання</option>
        </select>

        <div className="flex gap-2 ml-auto">
          {selected.length === 0 ? (
            <button onClick={exportAll} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm" disabled={loading}>
              {loading ? "Завантаження..." : "Завантажити весь прайс (XLSX)"}
            </button>
          ) : (
            <>
              <button onClick={() => exportSelected("xlsx")} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm" disabled={loading}>
                {loading ? "Завантаження..." : "Експорт XLSX (вибрані)"}
              </button>
              <button onClick={() => exportSelected("xml")} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm" disabled={loading}>
                {loading ? "Завантаження..." : "Експорт XML (вибрані)"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Таблиця товарів */}
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
              {/*<th className="p-2">Оптова ціна, грн</th>*/}
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
                  <img src={p.image} alt={p.title} className="w-24 h-24 object-contain rounded shadow-md" />
                  <div className="fixed z-50 hidden group-hover:block bg-white border p-1 rounded shadow-xl" style={{ top: "100px", left: "calc(100% - 400px)" }}>
                    <img src={p.image} alt={p.title} className="w-[400px] h-[400px] object-contain" />
                  </div>
                </td>
                <td className="p-2">{p.product_code}</td>
                <td className="p-2">{p.title}</td>
                <td className="p-2">{p.category_name}</td>
                <td className="p-2">{p.brand}</td>
                <td className="p-2">{p.article}</td>
                <td className="p-2">{Number(p.price_usd).toLocaleString()}</td>
                {/*<td className="p-2">{Number(p.price_uah).toLocaleString()}</td>*/}
                <td className="p-2">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
