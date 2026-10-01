import { useState } from "react";
import "./DiscountCalculator.css";

// Справочник категорий: ключ — id, значение — { label, discount }
// discount хранится в процентах (число)
const CATEGORIES = [
  { id: "electronics", label: "Электроника", discount: 5 },
  { id: "clothing",    label: "Одежда",      discount: 15 },
  { id: "groceries",   label: "Продукты",    discount: 10 },
  { id: "books",       label: "Книги",       discount: 20 },
  { id: "other",       label: "Другое",      discount: 0 },
];

// Ставка НДС в долях (22%)
const VAT_RATE = 0.22;

function DiscountCalculator() {
  // --- Состояние ---
  // Исходная цена, введённая пользователем (строка — для controlled input)
  const [price, setPrice] = useState("");
  // ID выбранной категории
  const [category, setCategory] = useState("electronics");
  // Признак того, что пользователь нажал «Рассчитать»
  // До первого нажатия результаты не показываем
  const [calculated, setCalculated] = useState(false);
  // Сообщение об ошибке валидации цены
  const [error, setError] = useState("");

  // --- Обработчики событий ---
  // Изменение цены: разрешаем только цифры и точку
  function handlePriceChange(e) {
    const value = e.target.value;
    // Разрешаем пустую строку (чтобы пользователь мог стереть поле)
    // и числа с одной точкой
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
      setError("");         // Сбрасываем ошибку при вводе
      setCalculated(false); // Пересчёт нужен заново
    }
  }

  // Изменение категории
  function handleCategoryChange(e) {
    setCategory(e.target.value);
    setCalculated(false); // Категория изменилась — результаты устарели
  }
  // Нажатие кнопки «Рассчитать»
  function handleCalculate() {
    // Парсим цену в число
    const numPrice = parseFloat(price);
    // Валидация: пустое поле
    if (!price.trim()) {
      setError("Введите цену товара");
      setCalculated(false);
      return;
    }
    // Валидация: не число или отрицательное
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Цена должна быть положительным числом");
      setCalculated(false);
      return;
    }
    // Валидация прошла — показываем результаты
    setError("");
    setCalculated(true);
  }

  // Сброс формы
  function handleReset() {
    setPrice("");
    setCategory("electronics");
    setCalculated(false);
    setError("");
  }

  // --- Вычисления ---
  // Находим объект выбранной категории
  const selectedCategory = CATEGORIES.find((c) => c.id === category);
  // Все вычисления проводим только если calculated === true
  // и цена корректна
  const numPrice = parseFloat(price) || 0;
  const discountPercent = selectedCategory ? selectedCategory.discount : 0;
  const discountAmount = calculated ? numPrice * (discountPercent / 100) : 0;
  const priceAfterDiscount = calculated ? numPrice - discountAmount : 0;
  const vatAmount = calculated ? priceAfterDiscount * VAT_RATE : 0;
  const total = calculated ? priceAfterDiscount + vatAmount : 0;
  // Вспомогательная функция: форматирование в рублях
  function formatRub(value) {
    return value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // --- Разметка ---
  return (
    <div className="calculator-wrapper">
      <h2 className="calculator-title">Калькулятор скидок</h2>

      {/* Поле ввода цены */}
      <div className="field">
        <label htmlFor="price" className="field__label">
          Цена товара (₽)
        </label>
        <input
          id="price"
          type="text"
          className={`field__input ${error ? "field__input--error" : ""}`}
          value={price}
          onChange={handlePriceChange}
          placeholder="Например: 1000"
          inputMode="decimal"
        />
        {/* Показываем ошибку, если она есть */}
        {error && <span className="field__error">{error}</span>}
      </div>

      {/* Выбор категории */}
      <div className="field">
        <label htmlFor="category" className="field__label">
          Категория товара
        </label>
        <select
          id="category"
          className="field__input field__select"
          value={category}
          onChange={handleCategoryChange}
        >
          {/* Генерируем <option> из справочника категорий */}
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label} — скидка {cat.discount}%
            </option>
          ))}
        </select>
      </div>
      {/* Кнопки */}
      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={handleCalculate}>
          Рассчитать
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleReset}>
          Сбросить
        </button>
      </div>

      {/* Результаты — показываем только после расчёта */}
      {calculated && !error && (
        <div className="results">
          <h3 className="results__title">Результат расчёта</h3>
          <table className="results__table">
            <tbody>
              <tr>
                <td>Исходная цена</td>
                <td className="results__value">{formatRub(numPrice)} ₽</td>
              </tr>
              <tr>
                <td>
                  Скидка ({discountPercent}%, категория «{selectedCategory.label}»)
                </td>
                <td className="results__value results__value--discount">
                  −{formatRub(discountAmount)} ₽
                </td>
              </tr>
              <tr>
                <td>Цена после скидки</td>
                <td className="results__value">{formatRub(priceAfterDiscount)} ₽</td>
              </tr>
              <tr>
                <td>НДС (22%)</td>
                <td className="results__value">+{formatRub(vatAmount)} ₽</td>
              </tr>
              <tr className="results__row--total">
                <td>Итого к оплате</td>
                <td className="results__value">{formatRub(total)} ₽</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DiscountCalculator;
