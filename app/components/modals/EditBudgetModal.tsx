'use client'
import { useState } from 'react'
import ModalWrapper from './ModalWrapper'

export default function EditBudgetModal({ isOpen, onClose, currentBudget, onSave }: any) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value) return
    onSave(parseInt(value))
    setValue('')
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Update Monthly Budget">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">New Budget Limit</label>
          <input 
            type="number" 
            placeholder={currentBudget.toString()}
            className="w-full p-3 border rounded-xl text-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <button 
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </ModalWrapper>
  )
}