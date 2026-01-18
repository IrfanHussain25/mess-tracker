'use client'
import { useState } from 'react'
import ModalWrapper from './ModalWrapper'

export default function ManualAddModal({ isOpen, onClose, onAdd }: any) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
          <input type="number" className="w-full p-3 border rounded-xl text-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="₹0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
           <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
           <input type="datetime-local" className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-purple-500" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button onClick={() => { if(amount) { onAdd(amount, date); setAmount(''); setDate('') } }} className="w-full bg-purple-600 text-white p-3 rounded-xl font-bold hover:bg-purple-700">Add Entry</button>
      </div>
    </ModalWrapper>
  )
}