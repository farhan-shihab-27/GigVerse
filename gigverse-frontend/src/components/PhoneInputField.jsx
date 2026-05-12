// src/components/PhoneInputField.jsx
// Wraps react-phone-number-input with GigVerse Tailwind brand styling
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

/**
 * @param {string}   value     - E.164 phone string (e.g. "+8801XXXXXXXXX")
 * @param {Function} onChange  - Setter receiving the new E.164 string
 * @param {string}   id       - HTML id for the input (accessibility)
 */
export default function PhoneInputField({ value, onChange, id = 'phone-input' }) {
  return (
    <div className="gv-phone-wrapper">
      <PhoneInput
        id={id}
        international
        defaultCountry="BD"
        value={value}
        onChange={onChange}
        placeholder="Enter phone number"
        countryCallingCodeEditable={false}
      />
    </div>
  );
}
