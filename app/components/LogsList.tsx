import { Trash2, ReceiptText, Clock } from 'lucide-react'

export default function LogsList({ logs, onDelete }: any) {
  if (logs.length === 0) {
    return (
      <div className="mt-8 text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <ReceiptText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-400 text-sm">No transactions yet.</p>
      </div>
    )
  }

  return (
    <div className="mt-8 pb-32">
      <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center gap-2">
        <Clock size={18} className="text-blue-500"/> Recent Activity
      </h3>
      <div className="space-y-3">
        {logs.map((log: any) => (
          <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-50 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ${log.bill_no ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                {log.bill_no || 'Man'}
              </div>
              <div>
                <p className="font-bold text-gray-700">
                  {log.bill_no ? `Bill #${log.bill_no}` : 'Manual Entry'}
                </p>
                <p className="text-xs text-gray-400 font-medium">
                  {new Date(log.bill_date || log.created_at).toLocaleString('en-IN', { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-red-500 font-bold text-lg">-₹{log.amount}</span>
              <button 
                onClick={() => onDelete(log.id, log.amount)} 
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}