'use client'
import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns'

const COLORS = { 
  Breakfast: '#8B5CF6', 
  Lunch: '#7C3AED',     
  Snacks: '#C4B5FD',    
  Dinner: '#4C1D95',    
  Other: '#E5E7EB'      
}

export default function AnalyticsCard({ logs }: { logs: any[] }) {
  const [view, setView] = useState<'dai' | 'week' | 'month'>('dai')

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    const now = new Date()
    let startDate = startOfMonth(now)
    if (view === 'dai') startDate = startOfDay(now)
    if (view === 'week') startDate = startOfWeek(now, { weekStartsOn: 1 })
    return logs.filter((log: any) => isAfter(new Date(log.bill_date), startDate))
  }, [logs, view])

  const totalSpent = filteredLogs.reduce((acc, log) => acc + log.amount, 0)
  
  const breakdown = useMemo(() => {
    const data: any = { Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0, Other: 0 }
    filteredLogs.forEach(log => {
      const type = log.meal_type || 'Other'
      if (data[type] !== undefined) data[type] += log.amount
      else data.Other += log.amount
    })
    return Object.keys(data).map(name => ({ name, value: data[name] })).filter(i => i.value > 0)
  }, [filteredLogs])

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
      <div className="flex bg-gray-50 p-1 rounded-xl mb-6">
        {['day', 'week', 'month'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
              view === v ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="text-center mb-6">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{view}ly Spending</p>
        <h2 className="text-4xl font-black text-gray-800 mt-1">₹{totalSpent}</h2>
      </div>

      {breakdown.length > 0 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={breakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                {breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name] || COLORS.Other} />
                ))}
              </Pie>
              <Tooltip itemStyle={{ color: '#4B5563', fontWeight: 'bold' }} contentStyle={{ borderRadius: '12px', border: 'none' }}/>
              <Legend verticalAlign="bottom" height={36} iconType="circle"/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-300 text-sm">No data for this period</div>
      )}
    </div>
  )
}