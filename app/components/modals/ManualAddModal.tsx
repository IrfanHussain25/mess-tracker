'use client'
import { useState } from 'react'
import ModalWrapper from './ModalWrapper'

export default function ManualAddModal({ isOpen, onClose, onAdd }: any) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')

  const handleSubmit = () => {
    if (!amount) return
    onAdd(amount, date)
    setAmount('')
    setDate('')
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <div className="space-y-4 text-black">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">₹</span>
            <input 
              type="number" 
              className="w-full p-3 pl-8 border rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div>
           <label className="text-xs font-bold text-gray-500 uppercase">Date (Optional)</label>
           <input 
             type="datetime-local" 
             className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
             value={date}
             onChange={(e) => setDate(e.target.value)}
           />
        </div>
        <button 
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Add Entry
        </button>
      </div>
    </ModalWrapper>
  )
}