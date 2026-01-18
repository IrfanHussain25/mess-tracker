'use client'
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

export default function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [])

  return (
    <div className="flex justify-between items-center w-full">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
          {greeting},
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <p className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
            @{name || 'student'}
          </p>
        </div>
      </div>
      
      <div className="h-10 w-10 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-200 transition-all cursor-pointer">
        <Bell size={20} />
      </div>
    </div>
  )
}