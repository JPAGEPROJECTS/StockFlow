import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="p-6 pt-20 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">StockFlow</h1>
      <p className="text-gray-500 mb-8">Gestión de inventario y ventas</p>

      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/inventario"
          className="border rounded-lg p-6 hover:bg-blue-50 hover:border-blue-400 transition text-center"
        >
          <div className="text-4xl mb-2">📦</div>
          <p className="font-semibold text-lg">Inventario</p>
          <p className="text-sm text-gray-500">Ver stock, crear y editar productos</p>
        </Link>

        <Link
          to="/ventas"
          className="border rounded-lg p-6 hover:bg-blue-50 hover:border-blue-400 transition text-center"
        >
          <div className="text-4xl mb-2">🛒</div>
          <p className="font-semibold text-lg">Ventas</p>
          <p className="text-sm text-gray-500">Registrar una nueva venta</p>
        </Link>
      </div>

      <div className="mt-4">
        <Link
          to="/reportes"
          className="block border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-400 transition text-center"
        >
          <p className="font-semibold">📊 Reportes</p>
          <p className="text-sm text-gray-500">Ventas diarias, mensuales y exportación</p>
        </Link>
      </div>
    </div>
  )
}