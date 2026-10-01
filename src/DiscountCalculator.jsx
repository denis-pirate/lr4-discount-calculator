import { useState, useRef } from "react";
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

// Промокоды: code — в верхнем регистре, discount — процентные пункты,
// которые ПРИБАВЛЯЮТСЯ к скидке категории (например, 20% + 10% = 30%)
const PROMO_CODES = [{ code: "WELCOME10", discount: 10 }];

// Верхняя граница итоговой скидки на позицию (%) — защита на случай новых промокодов
const MAX_DISCOUNT_PERCENT = 100;

// Максимум позиций в заказе (ограничивает высоту формы и таблицы результатов)
const MAX_ITEMS = 10;

// Категория по умолчанию для новой позиции
const DEFAULT_CATEGORY = "electronics";

function DiscountCalculator() {
  // --- Состояние ---
  // Список позиций заказа. Каждая позиция: { id, price, category }
  // price — строка (для controlled input), category — id из CATEGORIES
  const [items, setItems] = useState(() => [
    { id: 1, price: "", category: DEFAULT_CATEGORY },
  ]);
  // Счётчик для id новых позиций. id — стабильный key для React:
  // с индексом вместо id при удалении из середины списка поля «поедут»
  const nextIdRef = useRef(2);
  // Признак того, что пользователь нажал «Рассчитать»
  // До первого нажатия результаты не показываем
  const [calculated, setCalculated] = useState(false);
  // Ошибки валидации по позициям: { [id]: "текст ошибки" }
  const [errors, setErrors] = useState({});
  // Введённый промокод (строка — для controlled input) и ошибка по нему
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState("");

  // --- Обработчики событий ---
  // Создаёт пустую позицию с новым id
  function makeItem() {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return { id, price: "", category: DEFAULT_CATEGORY };
  }

  // Точечное изменение одной позиции; любое изменение делает результат устаревшим
  function updateItem(id, patch) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setCalculated(false);
  }

  // Изменение цены: разрешаем только цифры и точку
  function handlePriceChange(id, e) {
    const value = e.target.value;
    // Разрешаем пустую строку (чтобы пользователь мог стереть поле)
    // и числа с одной точкой
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      updateItem(id, { price: value });
      setErrors((prev) => ({ ...prev, [id]: "" })); // Сбрасываем ошибку этой позиции
    }
  }

  // Изменение категории
  function handleCategoryChange(id, e) {
    updateItem(id, { category: e.target.value });
  }

  // Изменение промокода: ошибка сбрасывается, результат устаревает
  function handlePromoChange(e) {
    setPromo(e.target.value);
    setPromoError("");
    setCalculated(false);
  }

  // Добавление позиции
  function handleAddItem() {
    if (items.length >= MAX_ITEMS) return;
    setItems((prev) => [...prev, makeItem()]);
    setCalculated(false);
  }

  // Удаление позиции (последнюю оставляем)
  function handleRemoveItem(id) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setErrors((prev) => ({ ...prev, [id]: "" }));
    setCalculated(false);
  }

  // Нажатие кнопки «Рассчитать»
  function handleCalculate() {
    // Проверяем все позиции сразу, чтобы показать все ошибки за один раз
    const nextErrors = {};
    for (const item of items) {
      const numPrice = parseFloat(item.price);
      // Валидация: пустое поле
      if (!item.price.trim()) {
        nextErrors[item.id] = "Введите цену товара";
      // Валидация: не число или не положительное
      } else if (isNaN(numPrice) || numPrice <= 0) {
        nextErrors[item.id] = "Цена должна быть положительным числом";
      }
    }
    setErrors(nextErrors);
    // Валидация промокода: пустое поле допустимо, непустой должен быть известным
    const code = promo.trim().toUpperCase();
    const nextPromoError =
      code && !PROMO_CODES.some((p) => p.code === code) ? "Промокод не найден" : "";
    setPromoError(nextPromoError);
    // Результаты показываем, только если нет ошибок ни в позициях, ни в промокоде
    setCalculated(Object.keys(nextErrors).length === 0 && !nextPromoError);
  }

  // Сброс формы: одна пустая позиция, без промокода
  function handleReset() {
    setItems([makeItem()]);
    setPromo("");
    setCalculated(false);
    setErrors({});
    setPromoError("");
  }

  // --- Вычисления ---
  // Применённый промокод (если введён известный); неизвестный даёт 0
  const promoCode = promo.trim().toUpperCase();
  const activePromo = PROMO_CODES.find((p) => p.code === promoCode);
  const promoPercent = activePromo ? activePromo.discount : 0;
  // Расчёт по каждой позиции
  const lines = items.map((item) => {
    const category = CATEGORIES.find((c) => c.id === item.category);
    const numPrice = parseFloat(item.price) || 0;
    // Процент скидки категории + процент промокода (складываем), не выше потолка
    const categoryPercent = category ? category.discount : 0;
    const discountPercent = Math.min(
      categoryPercent + promoPercent,
      MAX_DISCOUNT_PERCENT
    );
    const discountAmount = numPrice * (discountPercent / 100);
    return {
      id: item.id,
      label: category ? category.label : "—",
      numPrice,
      discountPercent,
      discountAmount,
      priceAfterDiscount: numPrice - discountAmount,
    };
  });
  // Итоги по заказу считаем по сумме позиций
  // Показываем их только если calculated === true
  const subtotal = calculated
    ? lines.reduce((sum, line) => sum + line.numPrice, 0)
    : 0;
  const discountTotal = calculated
    ? lines.reduce((sum, line) => sum + line.discountAmount, 0)
    : 0;
  const priceAfterDiscount = calculated ? subtotal - discountTotal : 0;
  const vatAmount = calculated ? priceAfterDiscount * VAT_RATE : 0;
  const total = calculated ? priceAfterDiscount + vatAmount : 0;
  // Вспомогательная функция: форматирование в рублях
  function formatRub(value) {
    return value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // Скидка со знаком «−»; нулевую скидку показываем без минуса (а не «−0,00 ₽»)
  function formatDiscount(value) {
    return value > 0 ? `−${formatRub(value)} ₽` : `${formatRub(0)} ₽`;
  }

  // --- Разметка ---
  return (
    <div className="calculator-wrapper">
      <h2 className="calculator-title">Калькулятор скидок</h2>

      {/* Список позиций */}
      {items.map((item, index) => {
        const itemError = errors[item.id];
        return (
          <div className="item" key={item.id}>
            <div className="item__header">
              <h3 className="item__title">Товар {index + 1}</h3>
              <button
                type="button"
                className="item__remove"
                onClick={() => handleRemoveItem(item.id)}
                disabled={items.length === 1}
                aria-label={`Удалить товар ${index + 1}`}
              >
                Удалить
              </button>
            </div>

            {/* Поле ввода цены */}
            <div className="field">
              <label htmlFor={`price-${item.id}`} className="field__label">
                Цена товара (₽)
              </label>
              <input
                id={`price-${item.id}`}
                type="text"
                className={`field__input ${itemError ? "field__input--error" : ""}`}
                value={item.price}
                onChange={(e) => handlePriceChange(item.id, e)}
                placeholder="Например: 1000"
                inputMode="decimal"
              />
              {/* Показываем ошибку, если она есть */}
              {itemError && <span className="field__error">{itemError}</span>}
            </div>

            {/* Выбор категории */}
            <div className="field">
              <label htmlFor={`category-${item.id}`} className="field__label">
                Категория товара
              </label>
              <select
                id={`category-${item.id}`}
                className="field__input field__select"
                value={item.category}
                onChange={(e) => handleCategoryChange(item.id, e)}
              >
                {/* Генерируем <option> из справочника категорий */}
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} — скидка {cat.discount}%
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      {/* Промокод (необязательно) */}
      <div className="field">
        <label htmlFor="promo" className="field__label">
          Промокод (необязательно)
        </label>
        <input
          id="promo"
          type="text"
          className={`field__input ${promoError ? "field__input--error" : ""}`}
          value={promo}
          onChange={handlePromoChange}
          placeholder="Например: WELCOME10"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
        />
        {promoError && <span className="field__error">{promoError}</span>}
      </div>

      {/* Добавление позиции */}
      <button
        type="button"
        className="btn btn--secondary add-item"
        onClick={handleAddItem}
        disabled={items.length >= MAX_ITEMS}
      >
        + Добавить товар ({items.length} из {MAX_ITEMS})
      </button>

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
      {calculated && (
        <div className="results">
          <h3 className="results__title">Результат расчёта</h3>

          {/* Пояснение про промокод: проценты в таблице уже включают его */}
          {activePromo && (
            <p className="results__note">
              Промокод {activePromo.code}: +{activePromo.discount}% к скидке
              каждой позиции
            </p>
          )}

          {/* Расчёт по позициям */}
          <div className="results__scroll">
            <table className="results__table results__table--items">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className="results__value">Цена</th>
                  <th className="results__value">Скидка</th>
                  <th className="results__value">Со скидкой</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id}>
                    <td>
                      {index + 1}. {line.label} ({line.discountPercent}%)
                    </td>
                    <td className="results__value">{formatRub(line.numPrice)} ₽</td>
                    <td className="results__value results__value--discount">
                      {formatDiscount(line.discountAmount)}
                    </td>
                    <td className="results__value">
                      {formatRub(line.priceAfterDiscount)} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Итоги по заказу */}
          <table className="results__table">
            <tbody>
              <tr>
                <td>Сумма без скидки</td>
                <td className="results__value">{formatRub(subtotal)} ₽</td>
              </tr>
              <tr>
                <td>Скидка (всего)</td>
                <td className="results__value results__value--discount">
                  {formatDiscount(discountTotal)}
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
