'use client'
import { useState, useMemo } from 'react'
import { Trash2, ReceiptText, Clock, Filter, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function LogsList({ logs, onDelete }: any) {
  // Defaults to current month
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedType, setSelectedType] = useState('All')

  // --- FILTERING & SORTING ---
  const processedLogs = useMemo(() => {
    if (!logs) return []

    return logs
      .filter((log: any) => {
        const logDate = new Date(log.bill_date || log.created_at)
        
        // 1. Month Filter
        const [year, month] = selectedMonth.split('-')
        const isMonthMatch = logDate.getFullYear() === parseInt(year) && logDate.getMonth() + 1 === parseInt(month)

        // 2. Meal Type Filter
        const isTypeMatch = selectedType === 'All' || (log.meal_type || 'Other') === selectedType

        return isMonthMatch && isTypeMatch
      })
      .sort((a: any, b: any) => {
        // 3. Sort Newest First
        return new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime()
      })
  }, [logs, selectedMonth, selectedType])

  return (
    <div className="mt-8 pb-32">
      {/* Header & Stats */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-purple-600"/> 
            Activity
          </h3>
          <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-500">
            {processedLogs.length} found
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {/* Month Input */}
          <div className="relative flex-1 group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-purple-500 transition-colors">
              <Calendar size={14} />
            </div>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 pl-9 pr-2 outline-none focus:ring-2 focus:ring-purple-100 transition-shadow shadow-sm"
            />
          </div>

          {/* Type Dropdown */}
          <div className="relative flex-1 group">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-purple-500 transition-colors">
              <Filter size={14} />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 pl-9 pr-6 outline-none focus:ring-2 focus:ring-purple-100 transition-shadow shadow-sm appearance-none"
            >
              <option value="All">All Types</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Snacks">Snacks</option>
              <option value="Dinner">Dinner</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {processedLogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <Filter className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No records match this filter.</p>
          </div>
        ) : (
          processedLogs.map((log: any) => (
            <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${log.bill_no ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                  {log.bill_no || <ReceiptText size={18}/>}
                </div>
                
                <div className="min-w-0">
                  <p className="font-bold text-gray-700 truncate">
                    {log.bill_no ? `Bill #${log.bill_no}` : 'Manual Entry'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
                    <span className={`px-2 py-0.5 rounded-md ${
                      log.meal_type === 'Dinner' ? 'bg-indigo-50 text-indigo-500' :
                      log.meal_type === 'Lunch' ? 'bg-emerald-50 text-emerald-500' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {log.meal_type}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(log.bill_date), 'dd MMM, hh:mm a')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pl-2">
                <span className="text-red-500 font-bold text-lg whitespace-nowrap">-₹{log.amount}</span>
                <button 
                  onClick={() => onDelete(log.id, log.amount)} 
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}