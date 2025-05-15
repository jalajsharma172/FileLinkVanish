
import React from "react";

const options = [
  { key: "one-time", label: "One-time view" },
  { key: "1h", label: "Expire in 1 hour" },
  { key: "24h", label: "Expire in 24 hours" },
  { key: "7d", label: "Expire in 7 days" },
];

const ExpirySelector: React.FC<{
  expiry: "one-time" | "1h" | "24h" | "7d";
  setExpiry: any;
  disabled?: boolean;
}> = ({ expiry, setExpiry, disabled }) => (
  <div className="mb-2 flex flex-col items-center">
    <span className="text-gray-600 mb-1 text-sm font-medium">Expiry:</span>
    <div className="flex gap-2 flex-wrap justify-center mt-1">
      {options.map((opt) => (
        <button
          className={`py-2 px-4 rounded-lg border transition-all text-sm font-medium 
          ${expiry === opt.key ? "bg-primary text-white shadow border-primary" : "bg-white text-primary border-gray-200"}
          hover:shadow-md hover:border-primary focus:outline-none`}
          key={opt.key}
          disabled={disabled}
          onClick={() => !disabled && setExpiry(opt.key)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

export default ExpirySelector;
