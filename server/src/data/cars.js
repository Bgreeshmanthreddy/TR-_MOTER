// Prices are the source of truth on the server so a booking cannot be
// submitted with a tampered price from the browser.
export const CARS = [
  { name: "BMW 3 Series", price: 4650000, body: "Sport Sedan" },
  { name: "Mercedes-Benz C-Class", price: 6120000, body: "Luxury Sedan" },
  { name: "Audi Q7", price: 9000000, body: "Luxury SUV" },
  { name: "Porsche 911", price: 19900000, body: "Sports Car" },
  { name: "BMW X5", price: 9700000, body: "Premium SUV" },
  { name: "Mercedes-Benz GLE", price: 10000000, body: "Luxury SUV" },
];

export function findCar(name) {
  return CARS.find((car) => car.name === name) ?? null;
}

export function formatPrice(price) {
  const crore = price / 10000000;
  const lakh = price / 100000;

  if (price >= 10000000) {
    return `₹${crore.toFixed(2).replace(/\.00$/, "")} Crore`;
  }

  return `₹${lakh.toFixed(1).replace(/\.0$/, "")} Lakh`;
}
