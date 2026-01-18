import { Edit2 } from 'lucide-react'

export default function BudgetCard({ spent, total, onEdit }: any) {
  const remaining = total - spent
  const percentage = Math.min(100, (spent / total) * 100)
  
  // Dynamic color logic
  let colorClass = "bg-green-500"
  if (percentage > 50) colorClass = "bg-yellow-500"
  if (percentage > 85) colorClass = "bg-red-500"

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
      <div className="flex justify-between items-end mb-2 relative z-10">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">Remaining Balance</p>
          <h2 className={`text-4xl font-bold tracking-tight ${remaining < 0 ? 'text-red-600' : 'text-gray-800'}`}>
            ₹{remaining}
          </h2>
        </div>
        <button onClick={onEdit} className="text-right group">
          <div className="flex items-center gap-1 justify-end text-xs text-gray-400 group-hover:text-blue-600 transition-colors">
            <span>Budget</span>
            <Edit2 size={12} />
          </div>
          <p className="font-bold text-lg text-gray-600">₹{total}</p>
        </button>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mt-6 relative z-10">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-right">{percentage.toFixed(1)}% used</p>
    </div>
  )
}