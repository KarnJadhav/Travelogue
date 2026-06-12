export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`px-5 py-2 rounded-full font-semibold shadow bg-blue-600 text-white hover:bg-blue-700 transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
