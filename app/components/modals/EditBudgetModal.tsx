'use client'
import { useState } from 'react'
import ModalWrapper from './ModalWrapper'

export default function EditBudgetModal({ isOpen, onClose, currentBudget, onSave }: any) {
  const [value, setValue] = useState('')
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Update Budget">
      <div className="space-y-4 text-gray-800">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Limit</label>
          <input type="number" placeholder={currentBudget.toString()} className="w-full p-3 border rounded-xl text-lg mt-1 outline-none focus:ring-2 focus:ring-purple-500" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </div>
        <button onClick={() => { if(value) { onSave(parseInt(value)); setValue('') } }} className="w-full bg-purple-600 text-white p-3 rounded-xl font-bold hover:bg-purple-700">Save</button>
      </div>
    </ModalWrapper>
  )
}